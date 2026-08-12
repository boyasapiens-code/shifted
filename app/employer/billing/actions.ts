"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeEnabled, getStripe, thbToSatang } from "@/lib/payments/stripe";
import { fulfillBoostPayment } from "@/lib/payments/boost";
import { fulfillSubscriptionCheckout } from "@/lib/payments/subscription";
import { BOOST_PRICE, BOOST_DAYS, isBoosted, PLANS } from "@/lib/constants";
import { SITE_URL } from "@/lib/site";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/employer/billing");
  return { supabase, user };
}

async function isPaid(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const { data } = await supabase
    .from("employer_profiles")
    .select("plan")
    .eq("id", id)
    .single();
  return data?.plan === "pro" || data?.plan === "growth";
}

/**
 * Upgrade to a paid plan tier — the subscription counterpart to
 * {@link startBoostCheckout} below, same shape:
 *
 * The plan is NEVER granted here on the employer's authority. We only insert
 * a `pending` payment, then:
 *  - **Live** (Stripe keys set): hand off to Stripe-hosted Checkout in
 *    subscription mode. `plan` is set only after the webhook confirms the
 *    first invoice paid — see {@link fulfillSubscriptionCheckout}.
 *    `employer_profiles_guard_plan()` (migration 0031) blocks any other path
 *    from setting `plan` to a paid tier.
 *  - **Preview** (no keys yet): fulfil immediately, no charge, so the flow
 *    stays testable end-to-end without keys.
 */
export async function upgradeTo(tier: "pro" | "growth") {
  const { supabase, user } = await requireUser();

  const planDef = PLANS.find((p) => p.key === tier);
  if (!planDef) redirect("/employer/billing?error=payment-init");

  const kind = tier === "pro" ? "plan_starter" : "plan_growth";

  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .insert({
      employer_id: user.id,
      kind,
      amount_thb: planDef.price,
      currency: "thb",
      status: "pending",
      provider: stripeEnabled() ? "stripe" : "preview",
    })
    .select("id")
    .single();
  if (payErr || !payment) redirect("/employer/billing?error=payment-init");

  // PREVIEW mode — grant now, no charge.
  if (!stripeEnabled()) {
    await fulfillSubscriptionCheckout(payment.id);
    revalidatePath("/employer", "layout");
    redirect("/employer/billing?upgraded=1&preview=1");
  }

  // LIVE mode — Stripe-hosted Checkout, subscription mode. Reuse an existing
  // Stripe Customer if we have one on file so repeated upgrade attempts
  // don't create duplicate customers.
  const { data: employer } = await supabase
    .from("employer_profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  const stripe = getStripe();
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(employer?.stripe_customer_id
        ? { customer: employer.stripe_customer_id }
        : { customer_email: user.email ?? undefined }),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "thb",
            unit_amount: thbToSatang(planDef.price),
            recurring: { interval: "month" },
            product_data: {
              name: `SHIFTED ${planDef.name} plan`,
              description: "Monthly employer subscription — cancel anytime.",
            },
          },
        },
      ],
      client_reference_id: payment.id,
      metadata: { payment_id: payment.id, tier, kind: "subscription" },
      subscription_data: { metadata: { employer_id: user.id, tier } },
      success_url: `${SITE_URL}/employer/billing?upgraded=1`,
      cancel_url: `${SITE_URL}/employer/billing?upgrade_canceled=1`,
    });
  } catch (e) {
    console.error("upgradeTo: Stripe session create failed", e);
    await createAdminClient()
      .from("payments")
      .update({ status: "failed" })
      .eq("id", payment.id);
    redirect("/employer/billing?error=stripe");
  }

  await createAdminClient()
    .from("payments")
    .update({ provider_session_id: session.id })
    .eq("id", payment.id);

  if (!session.url) redirect("/employer/billing?error=stripe-session");
  redirect(session.url);
}

/**
 * Downgrade to free. Live: cancels the Stripe subscription immediately
 * (not prorated / not at period end — matches the UI's plain "Downgrade"
 * button, no partial-period promises made anywhere in the copy); `plan`
 * itself flips to 'free' when the resulting `customer.subscription.deleted`
 * webhook arrives, same async-confirmation shape as everything else here.
 * Preview mode, or no live subscription on file: flip directly — the guard
 * trigger only blocks writes *to* a paid tier, so this always succeeds.
 */
export async function downgradeToFree() {
  const { supabase, user } = await requireUser();

  if (stripeEnabled()) {
    const { data: employer } = await supabase
      .from("employer_profiles")
      .select("stripe_subscription_id")
      .eq("id", user.id)
      .single();
    if (employer?.stripe_subscription_id) {
      try {
        await getStripe().subscriptions.cancel(employer.stripe_subscription_id);
      } catch (e) {
        console.error("downgradeToFree: Stripe cancel failed", e);
        redirect("/employer/billing?error=stripe-cancel");
      }
      revalidatePath("/employer", "layout");
      redirect("/employer/billing?downgraded=1");
    }
  }

  await supabase
    .from("employer_profiles")
    .update({ plan: "free", featured: false })
    .eq("id", user.id);
  revalidatePath("/employer", "layout");
  redirect("/employer/billing");
}

/** Featured employer placement — paid plans only. */
export async function toggleFeatured() {
  const { supabase, user } = await requireUser();
  if (!(await isPaid(supabase, user.id))) redirect("/employer/billing?gate=featured");
  const { data } = await supabase
    .from("employer_profiles")
    .select("featured")
    .eq("id", user.id)
    .single();
  await supabase
    .from("employer_profiles")
    .update({ featured: !data?.featured })
    .eq("id", user.id);
  revalidatePath("/employer/billing");
  revalidatePath("/employer");
}

/**
 * Boost a job to the top of search for {@link BOOST_DAYS} days — the Phase-1
 * paid wedge (standalone pay-per-use, no subscription needed).
 *
 * The boost is NEVER applied here on the employer's authority. We only insert a
 * `pending` payment, then:
 *  - **Live** (Stripe keys set): hand off to Stripe-hosted Checkout. The job is
 *    boosted only after the webhook confirms the charge — see
 *    {@link fulfillBoostPayment}. No card data ever touches our server.
 *  - **Preview** (no keys yet): fulfil immediately, no charge, so the flow is
 *    testable end-to-end today.
 */
export async function startBoostCheckout(jobId: string) {
  const { supabase, user } = await requireUser();

  // The job must be the caller's own, live, and not already boosted.
  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, status, boosted_until")
    .eq("id", jobId)
    .eq("employer_id", user.id)
    .single();
  if (!job) redirect("/employer?error=job-not-found");
  if (job.status !== "published")
    redirect(`/employer/jobs/${jobId}?error=boost-needs-published`);
  if (isBoosted(job.boosted_until)) redirect(`/employer/jobs/${jobId}?boosted=1`);

  // Ledger row (pending). RLS lets an employer insert their own row but never
  // mark it paid — only the service-role fulfilment path can do that.
  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .insert({
      employer_id: user.id,
      kind: "boost",
      job_id: jobId,
      amount_thb: BOOST_PRICE,
      currency: "thb",
      status: "pending",
      provider: stripeEnabled() ? "stripe" : "preview",
    })
    .select("id")
    .single();
  if (payErr || !payment) redirect("/employer/billing?error=payment-init");

  // PREVIEW mode — grant now, no charge.
  if (!stripeEnabled()) {
    await fulfillBoostPayment(payment.id);
    revalidatePath("/employer");
    redirect(`/employer/jobs/${jobId}?boosted=1&preview=1`);
  }

  // LIVE mode — Stripe-hosted Checkout. Payment methods follow what's enabled
  // on the Stripe account (card, PromptPay, …) so nothing is hard-coded here.
  const stripe = getStripe();
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "thb",
            unit_amount: thbToSatang(BOOST_PRICE),
            product_data: {
              name: `Boost: ${job.title}`,
              description: `${BOOST_DAYS}-day priority placement on SHIFTED`,
            },
          },
        },
      ],
      client_reference_id: payment.id,
      metadata: { payment_id: payment.id, job_id: jobId, kind: "boost" },
      success_url: `${SITE_URL}/employer/jobs/${jobId}?boosted=1`,
      cancel_url: `${SITE_URL}/employer/jobs/${jobId}?boost_canceled=1`,
    });
  } catch (e) {
    console.error("startBoostCheckout: Stripe session create failed", e);
    await createAdminClient()
      .from("payments")
      .update({ status: "failed" })
      .eq("id", payment.id);
    redirect("/employer/billing?error=stripe");
  }

  // Record the session id for traceability + idempotency (unique index). The
  // employer has no UPDATE policy, so this goes through the service role.
  await createAdminClient()
    .from("payments")
    .update({ provider_session_id: session.id })
    .eq("id", payment.id);

  if (!session.url) redirect("/employer/billing?error=stripe-session");
  redirect(session.url);
}
