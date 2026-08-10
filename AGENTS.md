# SHIFTED — Project Context

Two-sided workforce platform for hospitality, retail, lifestyle, wellness, and service
businesses. Built by operators. Stage: **early MVP / live testing**.

Live at **https://shiftedth.com**. Full monetization strategy doc lives in the
strategy folder (`SHIFTED_Monetization_Strategy.docx`), outside this repo.

## Codebase

- **Stack:** Next.js 15 (App Router, Server Components + Server Actions), TypeScript,
  Tailwind v4, Supabase (Postgres + Auth + Storage, RLS). Typeface: Satoshi.
- **Node is via nvm and not on the default PATH** — prefix commands with
  `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"`.
- **Commands:** `npm run dev` · `npm run build` · `npm run typecheck`.
- **DB:** migrations in `supabase/migrations/` (combined in `all_migrations.sql`).
  Apply directly with `node scripts/db-apply.mjs <file>` (uses `SUPABASE_DB_*` in
  `.env.local`). Seeds in `scripts/seed*.mjs` (require `ws` polyfill on Node 20).
- **Deploy:** Vercel, auto-deploys on push to `main`. `gh` is logged in (keyring).
- **Secrets:** `.env.local` (gitignored). Seed data is gitignored (PDPA).
- **Remaining setup:** custom SMTP (port 587), Google OAuth — see
  `docs/launch-checklist.md`.

## Monetization Model

**Principle:** Charge employers, keep workers free. Build liquidity first; monetize value
(speed, visibility, trust), not access. One clear paid offer beats five.

### Phase 1 — Build now
- Free job posting (liquidity engine)
- Paid **boosted listings** — first revenue, lowest friction (THB 199–499 / boost)
- **Employer subscription** pilot with 5–10 design partners
  (Free / Starter THB 990 / Growth THB 2,490 per month)
- Free operator toolkit as lead magnet (gated premium)
- Instrument metrics: active jobs, applies, hires, time-to-fill, repeat employers

### Phase 2 — Next
- Success / placement fee (flat THB 1,500–4,000 / hire; needs in-app hiring + guarantee window)
- Pay-per-post credits
- Verification / screening add-ons

### Phase 3 — Later
- On-demand shift fill (10–25% markup; high margin but Thai labour / worker-status risk)
- Workforce data & insights
- Bundle SOPs / training into top subscription tier

### Avoid
- Monetizing before liquidity exists
- Charging workers (the scarce side)
- Opaque pricing
- Off-platform leakage on success fees

> All THB prices are test hypotheses, not commitments.

## Trust Circle guardrails (enforced as code, not policy)

The Trust Circle (`tc_*` tables, migration 0019) is the employer-to-employer
referral network. These are **invariants**, not preferences. If a feature request
conflicts with one, the guardrail wins — fail closed (deny / hide). Any PR
touching `tc_*` data must keep `npm run test:trust-circle` green.

1. **Consent gate.** No worker data is returned by any network query without an
   `active` `tc_worker_consent` row for that scope. Enforced in the security-definer
   read functions; members have **no** broad table SELECT policy.
2. **No sensitive data.** Never add a column/field for health, criminal record,
   religion, ethnicity, sexual orientation, or any PDPA s.26 category.
3. **No compensation data.** Never add a salary/wage/pay/comp field to `tc_*`, and
   never build a feature to coordinate pay or no-poach.
4. **No employer free-text about a worker.** Endorsements/references are fixed
   scales only. The single free-text field (`tc_worker_response.body`) is the
   **worker's** right-to-respond.
5. **Audit on read.** Every network read writes a worker-visible `tc_access_log`
   row in the same transaction. No silent reads.
6. **Revocable.** Consent withdrawal turns off future visibility immediately; the
   log is retained.

## Working Notes
- Always think from both sides: employer and employee. Find win-win.
- Tone: practical, honest, operator-first, calm. No corporate jargon or hustle-culture fluff.
- Worker side is the scarce, valuable side — protect it.
