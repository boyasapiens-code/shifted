import { SUPPORT_EMAIL, SITE_NAME } from "@/lib/site";

// Transactional email for the app (NOT the Supabase auth emails — those are
// configured directly in the Supabase dashboard's SMTP settings and are
// unaffected by this file). Gated on RESEND_API_KEY, exactly like Stripe/
// Sentry: a no-op until it's set, so the app builds and runs today and
// starts sending the moment the key lands in env.
//
// Calls Resend's HTTP API directly (a plain fetch()) rather than SMTP via
// nodemailer. nodemailer opens raw SMTP/TLS sockets, which Cloudflare
// Workers doesn't support the way it needs — fetch() is the one HTTP
// primitive guaranteed to work identically on Node and Workers, so this
// removes that compatibility risk entirely instead of gambling on socket
// support. See NOTES.md for the migration note. Resend is still the
// provider (shiftedth.com is on Namecheap email forwarding, which can't
// send) — just via its REST API instead of its SMTP relay.

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

const FROM = process.env.EMAIL_FROM || `${SITE_NAME} <${SUPPORT_EMAIL}>`;

/**
 * Send one email. Never throws — a mail failure must not break the user action
 * that triggered it. Returns true if sent. When Resend isn't configured it logs
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
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      console.error("sendEmail failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("sendEmail failed:", err);
    return false;
  }
}
