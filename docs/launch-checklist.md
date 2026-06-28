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
`shiftedth.com` email is on **Google Workspace**. Project Settings →
Authentication → **SMTP Settings**:
- Sender email: `admin@shiftedth.com` · Sender name: `SHIFTED`
- Host: `smtp.gmail.com` · Port: `587` (STARTTLS) — or `465` (SSL)
- Username: `admin@shiftedth.com`
- Password: a **Google App Password**, *not* the mailbox password.

> ⚠️ **Google needs an App Password.** Plain-password SMTP is blocked. On the
> `admin@shiftedth.com` account: enable **2-Step Verification**, then create an
> App Password (Google Account → Security → App passwords) and paste that
> 16-character value as the SMTP password. Enter it in the Supabase dashboard
> yourself — it never goes in the repo.
>
> Note: `smtp.gmail.com` caps at ~2,000 messages/day (plenty for auth email at
> this stage). If you outgrow it, switch to the Workspace SMTP **relay**
> (`smtp-relay.gmail.com`), configured in the Google Admin console.

Then paste each branded bilingual template into Authentication → Emails:
- [`docs/email/magic-link.html`](email/magic-link.html) → **Magic Link**
- [`docs/email/confirm-signup.html`](email/confirm-signup.html) → **Confirm signup**
- [`docs/email/reset-password.html`](email/reset-password.html) → **Reset Password**

> The app signs users in with magic links (OTP), so **Magic Link** is the
> load-bearing one; the other two cover the confirm-email and password-reset
> flows. All three use the `{{ .ConfirmationURL }}` variable and the Daybreak
> palette (coral / cream / aubergine, Plus Jakarta Sans).

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
- ✅ Branded bilingual auth email templates (magic link, confirm signup, reset
  password) in `docs/email/` — paste into Supabase once SMTP is set (§2)
- ✅ Contact address `admin@shiftedth.com` wired into footer + legal/privacy pages

## Before real users (recommended follow-ups)
- Have a Thai lawyer review `/legal` (we collect national IDs — PDPA applies).
- Replace seed/demo data with real accounts; the seed data stays gitignored.
- Decide real billing (Stripe) to replace the monetization preview.
