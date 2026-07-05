#!/usr/bin/env node
/**
 * Send one test email through the app's SMTP config, to confirm notifications
 * will work. Reads the same env vars as lib/email/mailer.ts.
 *
 * Run:  node scripts/test-email.mjs                 (sends to SMTP_USER)
 *       node scripts/test-email.mjs you@example.com (sends to a given address)
 */
import nodemailer from "nodemailer";
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

const { SMTP_HOST = "smtp.resend.com", SMTP_PORT = "465", SMTP_USER, SMTP_PASS } = process.env;
if (!SMTP_USER || !SMTP_PASS) {
  console.error("✗ SMTP_USER / SMTP_PASS not set in .env.local — add them first.");
  process.exit(1);
}
const to = process.argv[2] || SMTP_USER;
const from = process.env.EMAIL_FROM || `SHIFTED <${SMTP_USER}>`;

const transport = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

try {
  await transport.verify();
  console.log(`✓ SMTP connection OK (${SMTP_HOST}:${SMTP_PORT})`);
  const info = await transport.sendMail({
    from,
    to,
    subject: "SHIFTED — SMTP test ✓",
    text: "If you can read this, transactional notifications are working.",
    html: '<p style="font-family:sans-serif">If you can read this, transactional notifications are working. ✓</p>',
  });
  console.log(`✓ Sent to ${to} (messageId ${info.messageId})`);
} catch (e) {
  console.error("✗ Failed:", e.message);
  process.exit(1);
}
