import { createAdminClient } from "@/lib/supabase/admin";
import { BOOST_DAYS } from "@/lib/constants";

// NOTE: this is intentionally NOT a "use server" module. These helpers run with
// the service-role key and must never be exposed as callable server actions —
// they are imported by the server action (preview mode) and the Stripe webhook
// (live mode) only. The single source of truth for granting a boost.

/**
 * Grant a paid boost. Idempotent: re-running for an already-resolved payment is
 * a no-op, so duplicate webhook deliveries are safe. Uses the service-role
 * client so it can (a) mark the payment 'paid' — employers have no UPDATE
 * policy — and (b) extend the job's boosted_until past the jobs_guard_boost()
 * trigger, which only the service_role may do.
 */
export async function fulfillBoostPayment(
  paymentId: string,
  paymentIntentId?: string,
) {
  const admin = createAdminClient();

  const { data: pay } = await admin
    .from("payments")
    .select("id, status, kind, job_id, employer_id")
    .eq("id", paymentId)
    .single();

  if (!pay || pay.status === "paid" || pay.status === "canceled") return;
  if (pay.kind !== "boost" || !pay.job_id) {
    await admin.from("payments").update({ status: "failed" }).eq("id", paymentId);
    return;
  }

  const until = new Date(Date.now() + BOOST_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await admin
    .from("jobs")
    .update({ boosted_until: until })
    .eq("id", pay.job_id)
    .eq("employer_id", pay.employer_id);

  // The `status = pending` guard makes the flip-to-paid single-shot under races.
  await admin
    .from("payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      ...(paymentIntentId ? { provider_payment_intent: paymentIntentId } : {}),
    })
    .eq("id", paymentId)
    .eq("status", "pending");
}

/** Mark a still-pending payment failed/canceled (Stripe async failure/expiry). */
export async function failPayment(
  paymentId: string,
  status: "failed" | "canceled" = "failed",
) {
  const admin = createAdminClient();
  await admin
    .from("payments")
    .update({ status })
    .eq("id", paymentId)
    .eq("status", "pending");
}
