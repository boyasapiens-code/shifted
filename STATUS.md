# SHIFTED — Status

Last updated: 2026-08-12. Read this first; don't re-derive what's below.

## Where things stand
- Live at shiftedth.com, early MVP / live-testing stage. Real bottleneck is
  liquidity, not features: 2 employer accounts (Stash BKK — founder's own;
  Greenstead — design partner), 0 applications, 0 messages so far.
- 6 published job listings: Stash BKK — Budtender (full-time), Budtender
  (Daily/Flexible), Cleaner, Admin. Greenstead — Promoter (TikTok
  Live/Shopee/Lazada), Sales Representative.

## Recently closed out (this session)
- `profiles.is_admin` privilege-escalation hole (migration 0030) — fixed, verified.
- Google OAuth login — wired end to end, verified live.
- ESLint actually configured (`eslint.config.mjs`); `npm run lint` works now.
- `npm audit fix` — 6/8 resolved; remaining 2 need a Next.js 16 major-upgrade
  decision (deferred, breaks `next lint`).
- Verification submit/resubmit silently-did-nothing bug — fixed on both
  candidate + employer verification pages.
- Auth-callback open-redirect hardening (`sanitizeNext()`) — not exploitable
  before, now defended against a future refactor.
- Vercel's own build (`package.json`'s `build` script) now runs
  `typecheck && test:moderation && test:matching && next build` — a broken
  deterministic check blocks the deploy itself, not just CI.
- `test:trust-circle` gated via a local git `pre-push` hook
  (`.husky/pre-push`) — auto-runs on any push touching Trust Circle surface,
  using local `.env.local` creds. No CI secrets, no branch protection.

## Monetization state
- Boost (฿299/30 days): live via Stripe Checkout in test-mode key — real
  charge flow, not preview.
- Employer subscription tiers (Free / Starter ฿990 / Growth ฿2,490/mo): real,
  live recurring Stripe charge (test-mode key — migration 0031/0032,
  `lib/payments/subscription.ts`). `employer_profiles_guard_plan()` blocks
  self-granting a paid tier outside the webhook, on **both INSERT and
  UPDATE** (0032 closed an INSERT-time bypass found by a dedicated post-ship
  audit — see below).
  - **Post-ship audit (2026-08-12) found and fixed 2 CRITICAL bugs** before
    real money was ever at stake: (1) the guard trigger above only covered
    UPDATE, so a first-time employer_profiles insert could self-grant a paid
    plan for free — fixed in 0032, verified in rolled-back transactions
    (self-grant blocked, normal signups unaffected). (2) `upgradeTo()` never
    checked for an existing subscription, so changing tiers via the normal
    "Choose {tier}" button created a SECOND parallel Stripe subscription
    instead of replacing the first — the employer would've been billed for
    both, with the old subscription's id unrecoverable. Fixed: blocked
    server-side (redirects with a clear error) and in the UI (paid-tier
    employer sees "downgrade to Free first" instead of a live "Choose"
    button that would trigger the bug). Verified live: Stash BKK subscribed
    to Starter for real (sub_1U3aphK3xOYHLaX2poqKsRVG, active), then
    confirmed the Growth card no longer offers a direct switch.
  - Also from the same audit: `syncSubscriptionStatus()` now falls back to
    `stripe_customer_id` when `stripe_subscription_id` isn't linked yet
    (mitigates, doesn't fully close, an out-of-order-webhook-delivery edge
    case) and clears `stripe_subscription_id` on lapse/cancel.
  - Earlier in the same session: the Stripe webhook endpoint wasn't
    subscribed to `customer.subscription.updated`/`.deleted` events (only the
    4 checkout.session.* ones) — added via the Stripe API.
  - **Known, deliberate gaps, not yet built**: no real in-place paid-to-paid
    tier switch (Stripe subscription price swap) — currently blocked, not
    solved; no `payments` ledger row per renewal invoice, only the initial
    checkout.
- Outcome-based billing ledger (confirmed hire ฿1,500, retention milestones
  ฿500–1,000) also on the same page — still accrues events only, no charge
  (separate from subscriptions/boost, not yet wired to Stripe).

## Cloudflare migration (in progress)
User decided to migrate everything from Vercel to Cloudflare Workers (via
OpenNext) + move DNS to Cloudflare too, with a staged rollout (verify on a
Cloudflare preview URL before touching DNS). Full plan:
`/Users/nisabo/.claude/plans/dreamy-painting-cupcake.md`.

**Phase 1 (Workers-compatibility code changes) — shipped to Vercel, 2026-08-12.**
Deliberately shipped to Vercel FIRST, before Cloudflare enters the picture,
so a code regression and a hosting regression are never debugged together:
- `lib/email/mailer.ts`: nodemailer/SMTP → Resend HTTP API (`fetch()`).
  Raw SMTP sockets aren't reliably Workers-compatible; `fetch()` is. New env
  var `RESEND_API_KEY` (same underlying Resend key as the old `SMTP_PASS`).
  **Not yet set in Vercel Production** — transactional email (new
  applicant/status/message) is currently a no-op until it's added there
  (copy the value from the existing `SMTP_PASS`/`.env.local`, then redeploy
  — Vercel env vars need a fresh deploy to take effect for serverless
  functions). This is the one open item before Phase 1 is fully verified.
- `app/api/payments/webhook/route.ts`: sync → async Stripe signature
  verification (`constructEventAsync`) — required on Workers' SubtleCrypto
  provider. **Verified live**: real boost checkout + webhook round-trip on
  production, confirmed in DB (`payments.status='paid'`, `boosted_until`
  extended 30 days).
- `lib/rights.ts` / `lib/marketing-content.ts`: eliminated request-time `fs`
  reads (Workers has no runtime filesystem) via a new build-time generator
  (`scripts/generate-content.mjs`, wired through `predev`/`pretypecheck`
  hooks — fully automatic, output gitignored, never stale). **Verified
  live**: rights + marketing-solutions pages (incl. Thai-language variant)
  render correctly on production.
- `next.config.ts`: apex→www redirect now lives in code (`redirects()`),
  not only Vercel's dashboard — this is the exact class of bug that broke
  the Stripe webhook once before. **Verified live**: `curl -I
  https://shiftedth.com/` → real `308` to `www`.

**Next**: user adds `RESEND_API_KEY` to Vercel + redeploys, then Phase 1 is
fully closed. Phase 2 (Cloudflare account + scaffolding) needs the user to
create a Cloudflare account and provision secrets — not something done
autonomously.

## Content CMS (2026-08-12) — replaces Markdown files with DB + admin UI
Separate from the Cloudflare migration above (started from "Astro headless
CMS?" → settled on "no new CMS/vendor — extend the existing Supabase app").
Know Your Rights articles and Marketing Solutions (ideas/spotlights) used to
live as `content/**/*.md` files, read via `fs` at build time
(`scripts/generate-content.mjs`, added for Cloudflare Phase 1). Now:
- New tables (migration `0033_content_cms.sql`): `rights_articles`,
  `marketing_ideas`, `marketing_spotlights`. Public read gated on
  `status <> 'draft'` (rights) / `published` (marketing) `or is_admin()`,
  admin-only write — same shape as the `questions` bank (0025).
- All `content/**/*.md` migrated in via a one-off idempotent script
  (`scripts/migrate-content-to-db.mjs`, safe to re-run, doesn't touch the
  source files) — 6 rights articles ×2 langs, 4 ideas, 2 spotlights.
- `lib/rights.ts` / `lib/marketing-content.ts` now query Supabase (async)
  instead of the generated file; `scripts/generate-content.mjs` and its
  `predev`/`pretypecheck` wiring are removed — content is edited live, not
  baked in at build time.
- New `/admin/content` — list + create/edit/delete for all three content
  types (`app/admin/content/**`, `components/admin/*Form.tsx`), gated by the
  same `requireAdmin()` every other admin page uses. Saves call
  `revalidatePath()` on every affected public URL (including the old
  slug/category on rename, since `/rights/[category]/[slug]` and
  `/marketing-solutions/{ideas,spotlights}/[slug]` are statically
  prerendered — without this, an edit wouldn't show up until the next
  deploy).
- **Caught before shipping**: 0033's RLS policy for `rights_articles` was
  `status = 'published'`, stricter than the app's real rule
  (`status <> 'draft'` — legal-review articles are public too). Every
  migrated article is `legal-review`, so this zeroed the rights hub. Fixed
  in `0034_rights_public_read_legal_review.sql`, caught via local preview
  before deploy. Also added `lib/supabase/public.ts` (cookie-free anon
  client) — `generateStaticParams()` has no request scope, so the normal
  cookie-aware server client throws there.
- **Verified**: full `npm run build` clean (85 routes); rights hub (en+th),
  one full article, marketing hub, one idea, one spotlight, and
  `/sitemap.xml` all confirmed live against real migrated data in local
  preview; all 7 `/admin/content*` routes confirmed auth-gated; every form
  field name cross-checked 1:1 against both the DB schema and the server
  action's `formData.get()` calls (zero mismatches); a synthetic
  insert/update/delete cycle against the real DB, using the exact row
  shapes the actions build, passed for all 3 tables.
- **Not yet verified** (needs a real login, which I don't do myself): an
  actual click-through of the `/admin/content` forms from an authenticated
  admin session. Everything reachable without logging in has been checked;
  this is the one remaining step and it's on you whenever convenient.

## Open follow-ups (see `docs/launch-checklist.md` "Before real users")
- Thai lawyer review of `/legal` (national IDs collected, PDPA applies).
- Swap Stripe key to `sk_live_…` to charge for real (boost + subscriptions
  both still on the test-mode key — no real money moves yet).
- Next.js 16 upgrade decision (2 remaining npm audit vulns, low severity).
- Real end-to-end check of transactional emails once there's real activity.
- Strategic: liquidity — more real job postings, direct employer outreach.

## Last deploy check
- Commit `ad87025` ("Cloudflare migration Phase 1: Workers-compatibility
  code changes") — CI: success (1m38s). Vercel: success, deployed.
  Checked 2026-08-12.

## Watch for
- Other Claude Code sessions may be operating on this repo concurrently and
  can push conflicting decisions without coordination (happened twice
  already — see NOTES.md). `git fetch`/`git log origin/main` before assuming
  you have the latest state or exclusive ownership of an open decision.
