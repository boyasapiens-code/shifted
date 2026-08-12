import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe, stripeEnabled } from "@/lib/payments/stripe";
import { fulfillBoostPayment, failPayment } from "@/lib/payments/boost";
import { fulfillSubscriptionCheckout, syncSubscriptionStatus } from "@/lib/payments/subscription";

// Stripe needs the raw, unparsed body to verify the signature; force the Node
// runtime and disable static optimisation.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook — the ONLY path that turns a real charge into a live boost.
 * Verifies the signature, then fulfils on payment. Handles PromptPay's async
 * flow: for those, the initial checkout.session.completed can arrive unpaid, so
 * we only fulfil when payment_status === 'paid' (or on async_payment_succeeded).
 */
export async function POST(req: NextRequest) {
  if (!stripeEnabled()) {
    return NextResponse.json({ error: "stripe not configured" }, { status: 503 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook secret not set" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature") ?? "";
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("stripe webhook: signature verification failed", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.payment_status === "paid") {
          const paymentId = s.metadata?.payment_id;
          if (!paymentId) break;
          if (s.metadata?.kind === "subscription") {
            await fulfillSubscriptionCheckout(paymentId, {
              subscriptionId:
                typeof s.subscription === "string" ? s.subscription : s.subscription?.id,
              customerId: typeof s.customer === "string" ? s.customer : s.customer?.id,
            });
          } else {
            const pi =
              typeof s.payment_intent === "string"
                ? s.payment_intent
                : s.payment_intent?.id;
            await fulfillBoostPayment(paymentId, pi ?? undefined);
          }
        }
        break;
      }
      case "checkout.session.async_payment_failed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.metadata?.payment_id) await failPayment(s.metadata.payment_id, "failed");
        break;
      }
      case "checkout.session.expired": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.metadata?.payment_id) await failPayment(s.metadata.payment_id, "canceled");
        break;
      }
      // Renewals, cancellations, and payment-failure status changes (active ->
      // past_due -> unpaid, ...) all land here — the ongoing source of truth
      // for a subscription's state after the initial checkout.
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscriptionStatus(
          sub.id,
          sub.status,
          event.type === "customer.subscription.deleted",
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
        );
        break;
      }
    }
  } catch (err) {
    // Return 500 so Stripe retries delivery.
    console.error("stripe webhook: handler error", err);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
