# SHIFTED — Security / RLS audit

_Last run: 2026-06-25. Re-run with `node scripts/audit-rls.mjs`._

## Model

SHIFTED runs on Supabase. The `anon` (logged-out) and `authenticated` Postgres
roles hold broad table-level grants — this is the standard Supabase setup — and
**Row-Level Security (RLS) is what actually enforces access**. RLS is enabled on
**all 30 public tables**, so policy correctness is load-bearing: a table with a
missing or overly-permissive policy is exposed regardless of intent.

## Finding (fixed) — worker PII readable by anyone

Four SELECT policies were written `using (true)`, which also applies to the
logged-out `anon` role (and the anon key ships in client JS, so it's effectively
public). This exposed:

| Table | What was exposed | Fix (migration 0024) |
|---|---|---|
| `candidate_profiles` | Worker name, **phone**, bio, location | Authenticated-only |
| `hire_references` | Worker reliability / rehire / no-show data | Authenticated-only |
| `worker_skills` | Which workers hold which verified skills | Authenticated-only |
| `reviews` | All review comments — **including `held`/`blocked` ones**, bypassing moderation | Authenticated-only, and held/blocked comments now visible only to author / subject / admin |

The worker is the scarce side we protect, so this was the highest-priority gap.

## Remaining permissive policies — reviewed, intentional

| Table | Policy | Why it's OK |
|---|---|---|
| `employer_profiles` | public SELECT | Job seekers browse companies pre-login. No personal data. |
| `skills` | public SELECT | Generic skill catalog (definitions), not personal. |
| `marketing_leads` | anon INSERT | Logged-out lead form. Now rate-limited (5/hr/IP). |
| `marketing_events` | anon INSERT | Logged-out analytics beacon. Insert-only; admin-read. |

## Recommendations (not yet done)

1. **Tighten `candidate_profiles` further** — authenticated is still broad (any
   logged-in worker can read another worker's phone). Ideal: own row + employers
   (for talent browsing) + admin, and drop `phone` from the talent-browse path.
2. **Revoke unused `anon` write grants** as defense-in-depth. RLS already blocks
   them, so this is belt-and-suspenders, but it shrinks the attack surface on
   every table except `marketing_leads` / `marketing_events`.
3. **Supabase dashboard** — enable leaked-password protection and (when SMTP is
   live) email confirmations; confirm Point-in-Time Recovery / backups are on.
4. **Service-role key** — server-only; never expose to the client (currently OK).

## How to verify

- `node scripts/audit-rls.mjs` — lists every permissive policy.
- `npm run test:trust-circle` — proves the consent-gated network invariants.
