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

## Open follow-ups (see `docs/launch-checklist.md` "Before real users")
- Thai lawyer review of `/legal` (national IDs collected, PDPA applies).
- Swap Stripe key to `sk_live_…` to charge for real (boost + subscriptions
  both still on the test-mode key — no real money moves yet).
- Next.js 16 upgrade decision (2 remaining npm audit vulns, low severity).
- Real end-to-end check of transactional emails once there's real activity.
- Strategic: liquidity — more real job postings, direct employer outreach.

## Last deploy check
- Commit `f5334f7` ("Fix two critical subscription-billing bugs found by
  post-ship audit") — CI: success (1m27s). Vercel: success, deployed.
  Checked 2026-08-12.

## Watch for
- Other Claude Code sessions may be operating on this repo concurrently and
  can push conflicting decisions without coordination (happened twice
  already — see NOTES.md). `git fetch`/`git log origin/main` before assuming
  you have the latest state or exclusive ownership of an open decision.
