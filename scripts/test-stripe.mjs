#!/usr/bin/env node
/**
 * Verify Stripe connectivity + Checkout Session creation, mirroring
 * startBoostCheckout (app/employer/billing/actions.ts) but without touching
 * the database. Safe to run against a test-mode OR live-mode secret key — it
 * does not charge anything; the created session just sits unpaid and expires
 * on its own (Stripe's default is 24h).
 *
 * Run:  node scripts/test-stripe.mjs
 */
import Stripe from "stripe";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("✗ STRIPE_SECRET_KEY not set in .env.local — add it first.");
  process.exit(1);
}
const mode = key.startsWith("sk_live_") ? "LIVE" : key.startsWith("sk_test_") ? "TEST" : "unknown";
console.log(`Key mode: ${mode}`);

const stripe = new Stripe(key, { typescript: true });
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://shiftedth.com";

try {
  const balance = await stripe.balance.retrieve();
  console.log(`✓ API key valid (account currency: ${balance.default_currency})`);
} catch (e) {
  console.error("✗ API key rejected:", e.message);
  process.exit(1);
}

try {
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "thb",
          unit_amount: 29900, // ฿299, matches BOOST_PRICE
          product_data: {
            name: "Boost: [test] Sample job",
            description: "30-day priority placement on SHIFTED",
          },
        },
      },
    ],
    metadata: { test: "scripts/test-stripe.mjs" },
    success_url: `${SITE_URL}/employer/jobs/test?boosted=1`,
    cancel_url: `${SITE_URL}/employer/jobs/test?boost_canceled=1`,
  });
  console.log(`✓ Checkout Session created: ${session.id}`);
  console.log(`  Open to pay with a test card (4242 4242 4242 4242, any future date/CVC):`);
  console.log(`  ${session.url}`);
  console.log(`\n  (This session is not linked to a real job — it's for connectivity`);
  console.log(`   verification only. It will expire unpaid; no charge occurs.)`);
} catch (e) {
  console.error("✗ Checkout session creation failed:", e.message);
  process.exit(1);
}

console.log(`\nWebhook secret set: ${process.env.STRIPE_WEBHOOK_SECRET ? "yes" : "no (add it once the Stripe webhook endpoint exists)"}`);
