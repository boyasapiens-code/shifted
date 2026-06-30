import nodemailer from "nodemailer";
import { SUPPORT_EMAIL, SITE_NAME } from "@/lib/site";

// Transactional email for the app (NOT the Supabase auth emails — those are
// configured in the Supabase dashboard). Gated on SMTP credentials, exactly
// like Stripe/Sentry: a no-op until SMTP_USER + SMTP_PASS are set, so the app
// builds and runs today and starts sending the moment creds land in env.
//
// Google Workspace SMTP: host smtp.gmail.com, port 587, user = a mailbox,
// pass = a Google App Password (see launch-checklist §2).

export function emailEnabled(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

const FROM =
  process.env.EMAIL_FROM || `${SITE_NAME} <${SUPPORT_EMAIL}>`;

let _transport: nodemailer.Transporter | null = null;
function transport() {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return _transport;
}

/**
 * Send one email. Never throws — a mail failure must not break the user action
 * that triggered it. Returns true if sent. When SMTP isn't configured it logs
 * and returns false (visible in dev, silent-safe in prod).
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  if (!emailEnabled()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[email:disabled] would send "${opts.subject}" → ${opts.to}`);
    }
    return false;
  }
  try {
    await transport().sendMail({ from: FROM, ...opts });
    return true;
  } catch (err) {
    console.error("sendEmail failed:", err);
    return false;
  }
}
