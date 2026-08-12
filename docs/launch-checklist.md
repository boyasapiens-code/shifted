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

## 5. Payments — Stripe checkout: boosts + subscriptions (live, test-mode key)
The Phase-1 paid wedge — boosting a job (฿299 / 30 days) — and the employer
subscription tiers (Starter ฿990/mo, Growth ฿2,490/mo) both run on
**Stripe-hosted Checkout** (no card data ever touches our server), sharing
the same key and webhook. `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are
set in both `.env.local` and Vercel Production, so the app is **out of
preview mode** — clicking *Boost* or *Choose {plan}* opens a real Stripe
Checkout session. The key currently set is a **`sk_test_…` key**, so it
charges nothing real yet; swap it for `sk_live_…` (and a matching live-mode
`STRIPE_WEBHOOK_SECRET`, on a **separate live-mode webhook endpoint** — see
event list below) when ready to actually collect money. Note: subscription
checkout has no design-partner allowlist in code — any employer can already
self-serve upgrade through a real (test-mode) Stripe subscription today.

- **Webhook** (this is what actually grants the boost / plan after payment)
  is registered at `https://www.shiftedth.com/api/payments/webhook` — **must
  be the `www` host**. The apex `shiftedth.com` 308-redirects to `www`, and
  Stripe does not follow redirects on webhook delivery, so an apex-registered
  endpoint silently never receives anything (this exact bug shipped once and
  was caught and fixed by testing a real payment end to end).
  - Send events: `checkout.session.completed`,
    `checkout.session.async_payment_succeeded`,
    `checkout.session.async_payment_failed`, `checkout.session.expired`
    (the async ones cover PromptPay's deferred confirmation), plus
    `customer.subscription.updated` and `customer.subscription.deleted`
    (subscription renewal/past-due/cancellation sync). **The subscription
    events are easy to forget when setting up a new (e.g. live-mode) webhook
    endpoint** — they shipped missing once already on the test-mode endpoint,
    which silently broke cancellation sync until caught by testing a real
    cancel end to end; see `NOTES.md`.
- The webhook is the **only** path that sets a job's `boosted_until` or an
  employer's `plan` (to a paid tier); DB triggers (`jobs_guard_boost()`,
  `employer_profiles_guard_plan()` — the latter covers both INSERT and
  UPDATE) block every other role, so neither can be granted without a
  confirmed charge — RLS separately blocks an employer from UPDATE-ing their
  own `payments` row at all.
- **Verified end to end**: boosted a real job with the Stripe test card
  (`4242 4242 4242 4242`), confirmed in the DB (not just the browser) that the
  webhook flipped `payments.status` to `paid` and extended `boosted_until` by
  30 days. Subscriptions verified the same way (upgrade → charge → webhook
  fulfils → cancel → webhook syncs back to free) — see STATUS.md
  "Monetization state" for the full trace, including a real bug found and
  fixed (double-subscription on a tier change) and a known scope gap (no
  `payments` ledger row per renewal invoice, only the initial checkout).

## 6. Error monitoring — Sentry (wired; needs a DSN)
The Sentry SDK is installed and configured but **dormant until a DSN is set** —
without it, every Sentry call is a no-op, so local/preview stay silent.

Wiring checked 2026-08-12 (not yet against a real DSN, since that needs a
sentry.io account): server (`sentry.server.config.ts`), edge
(`sentry.edge.config.ts`), and client (`instrumentation-client.ts`) all
correctly gate on `NEXT_PUBLIC_SENTRY_DSN`. `instrumentation.ts`'s
`onRequestError` hook captures Server Component / Route Handler / Server
Action errors regardless of any `error.tsx` boundary; the browser SDK
installs its own global `window.onerror` / `unhandledrejection` handlers on
init, so client-side errors are captured too. `npm run build` stays clean
with no DSN set.

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
- `NEXT_PUBLIC_SENTRY_DSN` gets inlined into the client bundle at **build**
  time (standard `NEXT_PUBLIC_*` behavior) — after saving it in Vercel,
  trigger a fresh deploy (push, or manual Redeploy). Just saving the env var
  doesn't retroactively update already-built client assets.
- `app/global-error.tsx` has the branded bilingual fallback + `captureException`
  call, but per Next.js semantics it only activates for a crash in the root
  layout itself. Ordinary page/component errors are still captured by Sentry
  (via the mechanisms above) but render Next's plain default error screen,
  since there's no `app/error.tsx` boundary anywhere yet — a UX gap, not a
  Sentry-capture gap. Add one later if the plain fallback becomes an issue.
- Verify after setting the DSN and redeploying: throw a test error, confirm it
  surfaces in the Sentry dashboard.

## Already done (in code)
- ✅ Favicon / app icon (S-monogram) and Open Graph share image
- ✅ PDPA-aware Privacy & Terms at `/legal` + consent checkbox at signup
- ✅ `/auth/confirm` route for token-based sign-in links
- ✅ Deployed to `shiftedth.com` with auto-deploy on push to `main`
- ✅ Sentry error monitoring scaffolded (PDPA-safe) — add a DSN to activate (§6)
- ✅ Stripe boost checkout **and** employer subscription billing (Starter/
  Growth) both live in test mode, verified end to end (§5) — swap to an
  `sk_live_…` key to charge for real
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
- ✅ **Decided** (2026-08-12): `test:trust-circle` gates via a local git
  `pre-push` hook (`.husky/pre-push`), not CI/branch-protection. It needs a
  live DB, so it can't run inside Vercel's or GitHub Actions' build sandbox —
  but rather than leave it purely human-checked (memory-dependent, exactly
  the kind of drift the original audit flagged), the hook runs
  `npm run test:trust-circle` automatically before any push that touches
  Trust Circle surface (`app/candidate/trust-circle/`,
  `app/employer/trust-circle/`, `app/account/privacy/export/route.ts`,
  `supabase/migrations/0019_trust_circle.sql`, or any migration whose diff
  mentions `tc_`), using the same local `.env.local` credentials already used
  for manual runs — no new secrets in any third-party system, no branch
  protection, unrelated pushes untouched. Conscious override:
  `git push --no-verify`. Only protects pushes made from a machine with this
  hook installed (`npm install` runs it via the `prepare` script); revisit if
  a second contributor's machine needs covering, or if CI/branch-protection
  becomes worth the added secrets surface.

## Before real users (recommended follow-ups)
- Have a Thai lawyer review `/legal` (we collect national IDs — PDPA applies).
- Swap the Stripe key to `sk_live_…` (§5) to charge for real — now covers
  both boosts and subscriptions, which share the same key and code path.
  Decide whether to gate subscription self-serve to specific employers first
  (no allowlist exists in code today) if a narrower pilot is still wanted —
  the strategy doc frames it as "a pilot with 5–10 design partners."
- Build a real paid-to-paid tier-switch flow (Stripe subscription price
  swap via `stripe.subscriptions.update()`) — today switching directly
  between Starter and Growth is blocked in the UI (redirects to downgrade-
  then-upgrade instead) because it would otherwise open a second, parallel
  subscription; see STATUS.md "Monetization state" for the bug this avoided.
