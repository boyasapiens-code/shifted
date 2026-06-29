import Stripe from "stripe";

/**
 * True only when Stripe keys are configured. Until then the app runs in
 * **preview mode**: boosts are granted immediately server-side with no charge,
 * so the whole flow is testable before keys exist. Flip to live by setting
 * STRIPE_SECRET_KEY (+ STRIPE_WEBHOOK_SECRET for the webhook).
 */
export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let _stripe: Stripe | null = null;

/** Lazily-constructed Stripe client. Throws if called without a secret key. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("getStripe: STRIPE_SECRET_KEY not set");
  // Pin to the SDK's bundled API version (omit apiVersion) so upgrades are
  // deliberate. typescript:true gives us typed responses.
  if (!_stripe) _stripe = new Stripe(key, { typescript: true });
  return _stripe;
}

/**
 * Stripe charges in the smallest currency unit. THB has 2 decimals, so the
 * subunit is satang: ฿299 → 29900.
 */
export function thbToSatang(thb: number): number {
  return Math.round(thb * 100);
}
