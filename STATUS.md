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
- Employer subscription tiers (Free / Starter ฿990 / Growth ฿2,490/mo): **now
  a real, live recurring Stripe charge** (test-mode key — see migration 0031,
  `lib/payments/subscription.ts`). Upgrade creates a real subscription-mode
  Checkout session; `employer_profiles_guard_plan()` blocks self-granting a
  paid tier outside the webhook. Downgrade cancels the real Stripe
  subscription. Verified fully end-to-end on Stash BKK's real account
  (upgrade → charge → webhook fulfils → cancel → webhook syncs back to free),
  including catching and fixing a real gap: the Stripe webhook endpoint
  wasn't subscribed to `customer.subscription.updated`/`.deleted` events (only
  the 4 checkout.session.* ones) — added via the Stripe API. Known scope gap:
  no `payments` ledger row per renewal invoice yet, only the initial checkout.
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
- Commit `b2e923e` ("Wire real Stripe subscription billing for employer plan
  tiers") — CI: success (1m9s). Vercel: success, deployed. Checked 2026-08-12.

## Watch for
- Other Claude Code sessions may be operating on this repo concurrently and
  can push conflicting decisions without coordination (happened twice
  already — see NOTES.md). `git fetch`/`git log origin/main` before assuming
  you have the latest state or exclusive ownership of an open decision.
