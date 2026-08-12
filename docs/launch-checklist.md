# SHIFTED — Launch checklist

The app is built and deployed. These are the remaining **dashboard-only** steps
(they can't be done in code) to make it production-ready for real users.

## 1. Supabase — Auth URL configuration ✅ done
Confirmed working: a real magic-link sign-in redirected correctly to
`shiftedth.com`, not `localhost`.

## 2. Email sending — Resend (one provider for auth + app email) ✅ done
`shiftedth.com` is on **Namecheap email forwarding** (MX →
`eforward*.registrar-servers.com`). Forwarding can *receive* mail at
`admin@shiftedth.com` but **cannot send**, so there's no mailbox/App Password to
use for SMTP. We send outbound through **Resend** instead (better deliverability
than Gmail SMTP, free at this volume, keeps `admin@shiftedth.com` as the sender).

**Set it up once, use it for both auth email and app notifications:**
1. Create a Resend account, **Add Domain** `shiftedth.com`.
2. Resend shows a few DNS records (SPF/DKIM, a `send.` subdomain + DMARC). Add
   them at **Namecheap → Domain → Advanced DNS**. These sit alongside the
   existing forwarding MX — they don't break inbound mail.
3. Wait for Resend to show the domain **Verified** (usually minutes).
4. Create an **API key** → this is the SMTP password.

SMTP credentials (used in both places below):
- Host `smtp.resend.com` · Port `465` (SSL) · Username `resend` · Password = the API key
- Sender: `admin@shiftedth.com` · Sender name `SHIFTED`

**Supabase auth email**: Project Settings → Authentication → **Emails → SMTP
Settings** → credentials above are entered and saved. The three branded
bilingual templates are pasted into Authentication → Emails:
- [`docs/email/magic-link.html`](email/magic-link.html) → **Magic Link**
- [`docs/email/confirm-signup.html`](email/confirm-signup.html) → **Confirm signup**
- [`docs/email/reset-password.html`](email/reset-password.html) → **Reset Password**

Verified end to end: a real magic-link email was requested, arrived from
`admin@shiftedth.com` with the branded template intact, and signing in via
that link worked.

### 2b. App transactional emails (new-applicant / status / message) ✅ done
`SMTP_USER` / `SMTP_PASS` (a separate Resend API key from the one Supabase
uses, so either can be rotated independently) are set in both `.env.local` and
Vercel Production. `SMTP_HOST`/`SMTP_PORT`/`EMAIL_FROM` are left unset and rely
on their in-code defaults (`smtp.resend.com:465`, `SHIFTED <admin@shiftedth.com>`).

Not yet verified with a *real* notification firing — the platform has 0
applications and 0 messages so far, so `lib/notify.ts` hasn't actually been
exercised live. Worth a real check once there's real activity. Manual check
any time: `node scripts/test-email.mjs`.

> Why notifications matter: without them the marketplace loop is pull-only —
> nobody learns they got an applicant, an interview, or a message until they
> manually return. This is the single highest-leverage activation lever.
> Templates: `lib/email/templates.ts`; senders: `lib/notify.ts`.

## 3. Google login ✅ done
Google Cloud project + OAuth consent screen (External) + Web OAuth client
created; Client ID + Secret wired into Supabase → Authentication → Providers
→ **Google**. Verified end to end: "Continue with Google" on
`shiftedth.com/login` reaches Google's real account-chooser screen with the
correct `client_id` — no `invalid_client` error.
- JS origins: `https://shiftedth.com`, `https://www.shiftedth.com`
- Redirect URI: `https://zradcsybgyqkmhescava.supabase.co/auth/v1/callback`

## 4. Verification reviewer
The `boyasapiens@gmail.com` account is an admin (`profiles.is_admin = true`) and
can review verification at `/admin/verifications`. `is_admin` is guarded by a
DB trigger (`profiles_guard_admin()`, migration 0030) — it can only be changed
by the service role, never through the app or a user's own client. Grant
additional reviewers with a one-off service-role script/query
(`update profiles set is_admin = true where id = '<uid>'` run via
`scripts/db-apply.mjs`-style direct connection), not through any in-app action.

## 5. Payments — Stripe boost checkout (live, test-mode key)
The Phase-1 paid wedge — boosting a job (฿299 / 30 days) — runs on
**Stripe-hosted Checkout** (no card data ever touches our server).
`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set in both `.env.local`
and Vercel Production, so the app is **out of preview mode** — clicking
*Boost* opens a real Stripe Checkout session. The key currently set is a
**`sk_test_…` key**, so it charges nothing real yet; swap it for `sk_live_…`
(and a matching live-mode `STRIPE_WEBHOOK_SECRET`) when ready to actually
collect money.

- **Webhook** (this is what actually grants the boost after payment) is
  registered at `https://www.shiftedth.com/api/payments/webhook` — **must be
  the `www` host**. The apex `shiftedth.com` 308-redirects to `www`, and
  Stripe does not follow redirects on webhook delivery, so an apex-registered
  endpoint silently never receives anything (this exact bug shipped once and
  was caught and fixed by testing a real payment end to end).
  - Send events: `checkout.session.completed`,
    `checkout.session.async_payment_succeeded`,
    `checkout.session.async_payment_failed`, `checkout.session.expired`
    (the async ones cover PromptPay's deferred confirmation).
- The webhook is the **only** path that sets a job's `boosted_until`; a DB
  trigger (`jobs_guard_boost()`) blocks every other role, so a boost can't be
  granted without a confirmed charge — RLS separately blocks an employer from
  UPDATE-ing their own `payments` row at all.
- **Verified end to end**: boosted a real job with the Stripe test card
  (`4242 4242 4242 4242`), confirmed in the DB (not just the browser) that the
  webhook flipped `payments.status` to `paid` and extended `boosted_until` by
  30 days. Subscriptions (Starter/Growth) remain preview-only for now.

## 6. Error monitoring — Sentry (wired; needs a DSN)
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
- ✅ Sentry error monitoring scaffolded (PDPA-safe) — add a DSN to activate (§6)
- ✅ Stripe boost checkout live in test mode, verified end to end (§5) — swap
  to an `sk_live_…` key to charge for real
- ✅ Bilingual EN/ไทย across the app (cookie locale + header toggle)
- ✅ Branded bilingual auth email templates (magic link, confirm signup, reset
  password) live in Supabase, verified with a real delivered sign-in email (§2)
- ✅ Contact address `admin@shiftedth.com` wired into footer + legal/privacy pages
- ✅ App transactional email (new applicant / status / message) has real SMTP
  creds set — not yet exercised by real activity (§2b)
- ✅ Mobile navigation menu (phone-first market) — nav + messages + view toggle
- ✅ Rate limits on apply / message / job-post (abuse guard, fail-open)
- ✅ Seed candidate PII removed; platform starts clean for real signups
- ✅ `profiles.is_admin` guarded against self-escalation (migration 0030) — was
  a real hole (any authenticated user could self-promote to admin and inherit
  every `is_admin()`-gated policy: payments, verification, moderation, Trust
  Circle reads); found by audit, fixed, verified closed
- ✅ CI (typecheck + moderation/matching tests + build) on every push/PR to `main`
- ✅ Google OAuth login wired up and verified end to end (§3)
- ✅ Verification submit/resubmit now shows a confirmation banner — previously
  the page redirected with `?submitted=<level>` after a successful (re)submit
  but rendered nothing for it, so submitting looked like it silently did
  nothing even though it worked; fixed on both `/candidate/verification` and
  `/employer/verification`
- ✅ ESLint actually configured (`eslint.config.mjs`) and a throwaway
  trust-circle test fixture re-seeded — `npm run lint` and
  `npm run test:trust-circle` (11/11) both run clean again (both were flagged
  by the platform audit that found the `is_admin` hole)
- ✅ `app/auth/callback/route.ts`'s `next` redirect param hardened
  (`sanitizeNext()`) — flagged as a low-priority hygiene note in the
  2026-08-11 audit: string concatenation (`${origin}${destination}`, not URL
  resolution) already made it non-exploitable as a classic open redirect, but
  `next` is attacker-controlled end to end and that safety depended entirely
  on the concatenation pattern never changing. Now only single-leading-slash
  relative paths pass; `//`, `/\`, absolute URLs, and tab/newline-bypass
  variants are rejected. Verified: typecheck + build clean, sanitizer checked
  against 11 cases, deployed commit confirmed live on `shiftedth.com`
- ✅ `npm run typecheck` / `test:moderation` / `test:matching` now gate
  Vercel's deploy, not just GitHub Actions — `package.json`'s `build` script
  (what Vercel runs by default) is `typecheck && test:moderation &&
  test:matching && next build`, so a broken deterministic check fails the
  Vercel build itself and the last-good production deployment stays live
  instead of being replaced. `ci.yml`'s Build step now calls the new
  `build:next-only` script to avoid re-running the same checks twice.
  `test:trust-circle` is **not** included — it needs a live DB connection via
  `SUPABASE_DB_*` creds read from `.env.local`, which don't exist in Vercel's
  or GitHub Actions' build environment. Verified: full chain (`npm run
  build`) passes clean on a cold `.next`, in the same order as CI.
- ✅ **Decided** (2026-08-12): `test:trust-circle` stays human-checked-only,
  not wired into any automated gate. It needs a live DB, so it can't run
  inside Vercel's build like the other two, and automating it would mean
  either running tests against the real production Supabase instance on
  every deploy, or adding `SUPABASE_DB_*` as GitHub Actions secrets plus
  branch protection to actually enforce it — deliberately not doing either
  for now. This matches what CLAUDE.md already mandates: any PR touching
  `tc_*` must keep `npm run test:trust-circle` green, checked manually by
  whoever's touching that code. Revisit if Trust Circle work picks up enough
  that manual discipline stops being reliable.

## Before real users (recommended follow-ups)
- Have a Thai lawyer review `/legal` (we collect national IDs — PDPA applies).
- Swap the Stripe key to `sk_live_…` (§5) to actually charge for boosts; then
  design-partner the Starter/Growth subscriptions before turning those live.
