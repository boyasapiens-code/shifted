# SHIFTED — Launch checklist

The app is built and deployed. These are the remaining **dashboard-only** steps
(they can't be done in code) to make it production-ready for real users.

## 1. Supabase — Auth URL configuration ⚠️ (fixes login redirects)
Authentication → **URL Configuration**:
- **Site URL:** `https://shiftedth.com`
- **Redirect URLs:** add
  - `https://shiftedth.com/auth/callback`
  - `https://www.shiftedth.com/auth/callback`
  - `https://www.shiftedth.com/auth/confirm`
  - `http://localhost:3000/auth/callback` (dev)

> Without this, magic links redirect to `localhost`. This is the root cause of
> the earlier login failures.

## 2. Supabase — Custom SMTP (lifts the email rate limit)
Project Settings → Authentication → **SMTP Settings** (sending from the
Greenstead Private Email mailbox):
- Sender email: `nisarat@greenstead-th.com` · Sender name: `SHIFTED`
- Host: `mail.privateemail.com` · Port: `465` (or `587`)
- Username: `nisarat@greenstead-th.com` · Password: *(mailbox password)*

Then paste [`docs/email/magic-link.html`](email/magic-link.html) into
Authentication → Emails → **Magic Link** template.

## 3. Google login (optional)
- Google Cloud Console → Credentials → OAuth client (Web):
  - JS origins: `https://shiftedth.com`, `https://www.shiftedth.com`
  - Redirect URI: `https://zradcsybgyqkmhescava.supabase.co/auth/v1/callback`
- Supabase → Authentication → Providers → **Google** → enable → paste Client
  ID + Secret.

## 4. Verification reviewer
The `boyasapiens@gmail.com` account is an admin (`profiles.is_admin = true`) and
can review verification at `/admin/verifications`. Grant additional reviewers by
setting `is_admin = true` on their profile.

## 5. Error monitoring — Sentry (wired; needs a DSN)
The Sentry SDK is installed and configured but **dormant until a DSN is set** —
without it, every Sentry call is a no-op, so local/preview stay silent.
- Create a project at sentry.io (platform: **Next.js**), copy the DSN.
- Add to `.env.local` and to Vercel → Project → Settings → Environment Variables:
  - `NEXT_PUBLIC_SENTRY_DSN` — turns on error capture (client + server + edge).
- Optional, for readable stack traces (uploads source maps at build time):
  - `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (auth token scope:
    `project:releases`). Without the token, builds still succeed — they just
    skip the upload.
- Privacy (PDPA): `sendDefaultPii: false` everywhere and **no Session Replay**,
  so no cookies, IPs, request bodies, or DOM recordings are sent. Keep it that
  way — worker PII must never leave the app via telemetry.
- Verify after setting the DSN: a thrown error surfaces in the Sentry dashboard;
  the styled fallback lives in `app/global-error.tsx`.

## Already done (in code)
- ✅ Favicon / app icon (S-monogram) and Open Graph share image
- ✅ PDPA-aware Privacy & Terms at `/legal` + consent checkbox at signup
- ✅ `/auth/confirm` route for token-based sign-in links
- ✅ Deployed to `shiftedth.com` with auto-deploy on push to `main`
- ✅ Sentry error monitoring scaffolded (PDPA-safe) — add a DSN to activate (§5)
- ✅ Bilingual EN/ไทย across the app (cookie locale + header toggle)

## Before real users (recommended follow-ups)
- Have a Thai lawyer review `/legal` (we collect national IDs — PDPA applies).
- Replace seed/demo data with real accounts; the seed data stays gitignored.
- Decide real billing (Stripe) to replace the monetization preview.
