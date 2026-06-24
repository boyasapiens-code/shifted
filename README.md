# SHIFTED

**The vetted talent network for Hospitality, Retail & Lifestyle (Thailand).**

> Help good people find good companies. Help good companies hire good people.

A curated, two-sided marketplace: verified employers and pre-screened candidates.
Built with Next.js (App Router) + Supabase. Minimal, editorial, black-and-white.

---

## Stack

- **Next.js 15** (App Router, Server Components, Server Actions) + TypeScript
- **Tailwind CSS v4** — editorial design system (`app/globals.css`)
- **Supabase** — Postgres, Auth (email magic-link + Google), Row-Level Security
- `@supabase/ssr` for cookie-based auth across server/client/middleware

## What's built

| Area | Routes |
| --- | --- |
| Marketing | `/` landing, `/about` how it works |
| Auth | `/login`, `/signup`, `/auth/callback`, `/onboarding` (role choice) |
| Discovery | `/jobs` (search + filters), `/jobs/[id]` (detail + one-click apply) |
| Candidate | `/candidate` dashboard, `/candidate/profile` editor |
| Employer | `/employer` dashboard, `/employer/profile`, `/employer/jobs/new`, `/employer/jobs/[id]` (manage applicants) |
| Talent | `/talent` candidate directory (employers) |

Data model + RLS live in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql):
`profiles`, `candidate_profiles`, `employer_profiles`, `jobs`, `applications`, `saved_jobs`.

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

At [supabase.com](https://supabase.com/dashboard) → New project. Then:

- **SQL Editor** → run the migrations in order: `0001_init.sql`,
  `0002_storage.sql`, `0003_staff.sql` (or `supabase db push` with the CLI).

### 3. Environment

```bash
cp .env.local.example .env.local
```

Fill in from **Project Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` — `http://localhost:3000` for local dev

### 4. Auth providers

In the Supabase dashboard → **Authentication**:

- **URL Configuration** → add both `http://localhost:3000/auth/callback` and
  `https://shiftedth.com/auth/callback` to **Redirect URLs**, and set the **Site URL**
  to `https://shiftedth.com`.
- **Email** is on by default (magic link).
- **Google** → enable the Google provider and paste your OAuth client ID/secret.
- **LINE** (planned) → add as a custom OIDC provider; `AuthForm` wires the same way.

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Try the flows

1. **Sign up** → choose **Candidate** or **Employer** at `/onboarding`.
2. As an **employer**: fill your company profile, then **Post a job** and publish it.
3. As a **candidate** (use a second account / browser): complete your profile,
   open the job at `/jobs`, and **one-click apply**.
4. Back as the **employer**: open the job from your dashboard to review applicants
   and move them through the pipeline (shortlist → interview → hire).

> Verification badges show when an employer's `verification` is set to `verified`.
> That's an admin/manual step today (set it in the `employer_profiles` table) — the
> automated vetting workflow is the natural next build.

---

## Deploying to shiftedth.com

1. Push the repo to GitHub and import it into **Vercel** (zero-config for Next.js).
2. Set environment variables in Vercel (Production): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL=https://shiftedth.com`.
   (Keep `SUPABASE_SERVICE_ROLE_KEY` for seeding only — don't expose it client-side.)
3. Add the domain in Vercel → **Domains** → `shiftedth.com`, then point DNS at Vercel
   (apex `A`/`ALIAS` + `www` `CNAME` per Vercel's instructions).
4. In Supabase → **Authentication → URL Configuration**, set Site URL to
   `https://shiftedth.com` and add `https://shiftedth.com/auth/callback` to Redirect
   URLs. Update the Google OAuth authorized redirect/origins to the same domain.

The canonical URL lives in [`lib/site.ts`](lib/site.ts); everything (metadata, OG,
auth redirects) derives from `NEXT_PUBLIC_SITE_URL` with `https://shiftedth.com` as
the fallback.

## Scripts

```bash
npm run dev        # local dev
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```

## Media uploads (Supabase Storage)

Buckets and RLS are in [`supabase/migrations/0002_storage.sql`](supabase/migrations/0002_storage.sql):
`avatars`, `portfolio`, `company` (public) and `resumes` (private). Files are stored
under `${userId}/<uuid>.<ext>`; RLS keys off the owning folder. Uploads auto-save
on selection ([`components/Uploader.tsx`](components/Uploader.tsx)).

- **Candidates** — avatar, résumé (PDF, private — owner previews via signed URL),
  portfolio gallery.
- **Employers** — logo, cover image, workplace photos (shown on job detail pages).

> Run `0002_storage.sql` in the SQL editor after `0001_init.sql`.
> Résumés are private to the candidate today; secure employer access is gated to a
> future verification/contact step rather than exposed publicly.

## Seeding from real data (Stash BKK)

Two Google-Forms exports (budtender applications + employee info) can be loaded
into SHIFTED as realistic demo data: **Stash BKK** as a verified employer, a
published **Budtender** job, **23 applicants** (candidate profiles + applications),
and **140 employee records**.

Employment status is encoded from a known roster: **current Stash BKK staff** (10
people, identified by nickname across both files) are seeded into the **Team**
(`staff` table) and marked not job-seeking; everyone else is **former staff** and
marked `open_to_work` (available talent). Hired applicants get application status
`hired`. The current-staff list lives in `CURRENT_STAFF` in
[`scripts/extract.py`](scripts/extract.py).

```bash
# 1. Transform the spreadsheets → clean JSON (masks ID numbers, drops ID photos).
#    Defaults to the files in ~/Downloads; override with --applicants / --employees.
npm run seed:extract

# 1b. (optional) Greenstead Co., Ltd. — a second employer + staff records,
#     parsed from Thai salary-acknowledgement payslips (.docx).
python3 scripts/extract_greenstead.py /path/to/*.docx

# 2. Load into Supabase. Requires NEXT_PUBLIC_SUPABASE_URL +
#    SUPABASE_SERVICE_ROLE_KEY in .env.local. Creates auth users via the Admin
#    API. Idempotent — safe to re-run. Seeds Greenstead too if its JSON exists.
npm run seed
```

Greenstead is seeded as a verified employer with its people in the `staff` table
(employer-private payroll records — see [`0003_staff.sql`](supabase/migrations/0003_staff.sql)),
surfaced as a **Team** list on the employer dashboard. Staff are records, not
candidate accounts, so no auth users are created for them.

- Transformed output lands in `scripts/seed-data/` — **gitignored**, since it
  contains personal data (Thai PDPA). Government ID numbers are masked to
  `"on-file"` and never stored; ID-document photo links are dropped.
- Mapping logic (salary parsing, Excel-date conversion, skills/languages
  inference, screening answers → application cover note) lives in
  [`scripts/extract.py`](scripts/extract.py); the loader is
  [`scripts/seed.mjs`](scripts/seed.mjs).
- Seeded users are created **passwordless + email-confirmed**; they can sign in
  later via magic link with their own email.

## Roadmap (from the brief)

- Reputation system (reliability score, workplace ratings, response speed)
- Secure résumé sharing with employers (post-verification)
- Saved jobs + interview scheduling
- LINE login
- Employer verification workflow + admin console
- Community (salary benchmarks, hiring guides)

---

Built by operators. Not recruiters. **The right shift can change everything.**
