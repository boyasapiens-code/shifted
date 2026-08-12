#!/usr/bin/env node
/**
 * Send one test email through the app's Resend HTTP API config (matches
 * lib/email/mailer.ts exactly — same env vars, same fetch call), to confirm
 * notifications will work.
 *
 * Run:  node scripts/test-email.mjs                 (sends to admin@shiftedth.com)
 *       node scripts/test-email.mjs you@example.com (sends to a given address)
 */
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

const { RESEND_API_KEY, EMAIL_FROM = "SHIFTED <admin@shiftedth.com>" } = process.env;
if (!RESEND_API_KEY) {
  console.error("✗ RESEND_API_KEY not set in .env.local — add it first.");
  process.exit(1);
}
const to = process.argv[2] || "admin@shiftedth.com";

try {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to,
      subject: "SHIFTED — Resend API test ✓",
      text: "If you can read this, transactional notifications are working.",
      html: '<p style="font-family:sans-serif">If you can read this, transactional notifications are working. ✓</p>',
    }),
  });
  if (!res.ok) {
    console.error(`✗ Failed: ${res.status}`, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  console.log(`✓ Sent to ${to} (id ${data.id})`);
} catch (e) {
  console.error("✗ Failed:", e.message);
  process.exit(1);
}
