import { createAdminClient } from "@/lib/supabase/admin";

// NOTE: this is intentionally NOT a "use server" module — same rule as
// lib/payments/boost.ts. These helpers run with the service-role key and
// must never be exposed as callable server actions; they're imported by the
// server action (preview mode) and the Stripe webhook (live mode) only.

/**
 * Grant a paid plan tier after a subscription checkout completes. Idempotent:
 * re-running for an already-resolved payment is a no-op, so duplicate
 * webhook deliveries are safe. Uses the service-role client so it can (a)
 * mark the payment 'paid' — employers have no UPDATE policy — and (b) set
 * `plan` past employer_profiles_guard_plan(), which only the service_role
 * may do.
 */
export async function fulfillSubscriptionCheckout(
  paymentId: string,
  stripeIds?: { subscriptionId?: string; customerId?: string },
) {
  const admin = createAdminClient();

  const { data: pay } = await admin
    .from("payments")
    .select("id, status, kind, employer_id")
    .eq("id", paymentId)
    .single();

  if (!pay || pay.status === "paid" || pay.status === "canceled") return;
  if (pay.kind !== "plan_starter" && pay.kind !== "plan_growth") {
    await admin.from("payments").update({ status: "failed" }).eq("id", paymentId);
    return;
  }

  const tier: "pro" | "growth" = pay.kind === "plan_starter" ? "pro" : "growth";

  await admin
    .from("employer_profiles")
    .update({
      plan: tier,
      plan_since: new Date().toISOString(),
      subscription_status: "active",
      ...(stripeIds?.subscriptionId ? { stripe_subscription_id: stripeIds.subscriptionId } : {}),
      ...(stripeIds?.customerId ? { stripe_customer_id: stripeIds.customerId } : {}),
    })
    .eq("id", pay.employer_id);

  // The `status = pending` guard makes the flip-to-paid single-shot under races.
  await admin
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", paymentId)
    .eq("status", "pending");
}

/**
 * Sync plan/status from a Stripe subscription lifecycle event — renewal,
 * cancellation, or a failed-payment status change (past_due, unpaid, ...).
 * The webhook is the only writer to `plan` (employer_profiles_guard_plan
 * blocks everyone else), so any lifecycle change — including a lapsed or
 * canceled subscription — has to flow through here or `plan` goes stale.
 *
 * Resolves the employer by stripe_subscription_id first. Stripe doesn't
 * guarantee webhook delivery order, so a subscription.updated/deleted event
 * can in principle arrive before the checkout.session.completed that would
 * have linked stripe_subscription_id — found by audit. If so, fall back to
 * stripe_customer_id (present on a re-subscribing employer from a prior
 * checkout; still a no-op for a brand-new employer's very first
 * subscription, since neither id is on file yet in that exact race). A true
 * no-op means it's genuinely not one of ours, or was already cleared.
 */
export async function syncSubscriptionStatus(
  subscriptionId: string,
  status: string,
  canceled: boolean,
  customerId?: string,
) {
  const admin = createAdminClient();
  let employer = (
    await admin
      .from("employer_profiles")
      .select("id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle()
  ).data;

  if (!employer && customerId) {
    employer = (
      await admin
        .from("employer_profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle()
    ).data;
  }

  if (!employer) return;

  const lapsed =
    canceled || status === "canceled" || status === "unpaid" || status === "incomplete_expired";

  await admin
    .from("employer_profiles")
    .update(
      lapsed
        ? {
            plan: "free",
            featured: false,
            subscription_status: status,
            stripe_subscription_id: null,
          }
        : { subscription_status: status, stripe_subscription_id: subscriptionId },
    )
    .eq("id", employer.id);
}
