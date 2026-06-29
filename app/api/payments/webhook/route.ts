import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe, stripeEnabled } from "@/lib/payments/stripe";
import { fulfillBoostPayment, failPayment } from "@/lib/payments/boost";

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
          const pi =
            typeof s.payment_intent === "string"
              ? s.payment_intent
              : s.payment_intent?.id;
          if (paymentId) await fulfillBoostPayment(paymentId, pi ?? undefined);
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
    }
  } catch (err) {
    // Return 500 so Stripe retries delivery.
    console.error("stripe webhook: handler error", err);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
