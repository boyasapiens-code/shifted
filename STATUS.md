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
- Employer subscription tiers (Free / Starter ฿990 / Growth ฿2,490/mo):
  scaffolded and live at `/employer/billing` — tier cards, features,
  upgrade/downgrade actions all work, but activate for **preview only**, no
  recurring charge yet (`isPaidPlan`/`plan` column exist; no Stripe
  subscription object wired up). Stash BKK is currently on Starter (preview).
- Outcome-based billing ledger (confirmed hire ฿1,500, retention milestones
  ฿500–1,000) also scaffolded on the same page — accrues events, no charge.

## Open follow-ups (see `docs/launch-checklist.md` "Before real users")
- Thai lawyer review of `/legal` (national IDs collected, PDPA applies).
- Swap Stripe key to `sk_live_…` to charge for real.
- Next.js 16 upgrade decision (2 remaining npm audit vulns, low severity).
- Real end-to-end check of transactional emails once there's real activity.
- Strategic: liquidity — more real job postings, direct employer outreach.

## Last deploy check
- Commit `dddb69d` ("Add STATUS.md and NOTES.md for session continuity") —
  CI: success (1m28s). Vercel: success, deployed. Checked 2026-08-12.

## Watch for
- Other Claude Code sessions may be operating on this repo concurrently and
  can push conflicting decisions without coordination (happened twice
  already — see NOTES.md). `git fetch`/`git log origin/main` before assuming
  you have the latest state or exclusive ownership of an open decision.
