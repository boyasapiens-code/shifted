-- SHIFTED — full schema (migrations 0001–0032)
-- Regenerated 2026-08-12 — concatenation of supabase/migrations/*.sql in order.
-- Reference only: production applies each file individually via scripts/db-apply.mjs.


-- ============================================================
-- 0001_init.sql
-- ============================================================
-- SHIFTED — initial schema
-- Vetted talent network for Hospitality, Retail & Lifestyle (Thailand).
--
-- Run with the Supabase CLI (`supabase db push`) or paste into the SQL editor.
-- Designed around Supabase Auth: every auth user gets a `profiles` row, then
-- specializes into a candidate or employer profile during onboarding.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type account_role as enum ('candidate', 'employer', 'admin');

create type industry as enum (
  'restaurant',
  'cafe',
  'bar',
  'hotel',
  'hostel',
  'wellness',
  'retail',
  'lifestyle',
  'cannabis',
  'other'
);

create type employment_type as enum ('full_time', 'part_time', 'contract', 'temporary');

create type job_status as enum ('draft', 'published', 'closed');

create type application_status as enum (
  'applied',
  'shortlisted',
  'interviewing',
  'offered',
  'hired',
  'rejected',
  'withdrawn'
);

create type verification_status as enum ('unverified', 'pending', 'verified', 'rejected');

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user
-- ---------------------------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        account_role,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- candidate_profiles
-- ---------------------------------------------------------------------------
create table candidate_profiles (
  id                uuid primary key references profiles (id) on delete cascade,
  full_name         text,           -- denormalized so employers can see applicant names
  headline          text,
  bio               text,
  location          text,
  phone             text,
  languages         text[] not null default '{}',
  skills            text[] not null default '{}',
  years_experience  int    not null default 0,
  availability      text,           -- e.g. "Immediate", "2 weeks notice"
  open_to_work      boolean not null default true,
  resume_url        text,
  portfolio_urls    text[] not null default '{}',
  reliability_score int,            -- 0-100, future reputation system
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger candidate_profiles_set_updated_at
  before update on candidate_profiles
  for each row execute function set_updated_at();

create index candidate_profiles_open_idx on candidate_profiles (open_to_work);

-- ---------------------------------------------------------------------------
-- employer_profiles
-- ---------------------------------------------------------------------------
create table employer_profiles (
  id                  uuid primary key references profiles (id) on delete cascade,
  company_name        text not null,
  slug                text not null unique,
  industry            industry not null default 'other',
  description         text,
  location            text,
  website             text,
  logo_url            text,
  cover_url           text,
  photos              text[] not null default '{}',
  business_registered boolean not null default false,
  salary_transparency boolean not null default false,
  verification        verification_status not null default 'unverified',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger employer_profiles_set_updated_at
  before update on employer_profiles
  for each row execute function set_updated_at();

create index employer_profiles_industry_idx on employer_profiles (industry);

-- ---------------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------------
create table jobs (
  id                  uuid primary key default gen_random_uuid(),
  employer_id         uuid not null references employer_profiles (id) on delete cascade,
  title               text not null,
  description         text not null default '',
  industry            industry not null default 'other',
  location            text,
  employment_type     employment_type not null default 'full_time',
  shift_work          boolean not null default false,
  salary_min          int,
  salary_max          int,
  salary_period       text not null default 'month',  -- 'hour' | 'day' | 'month'
  languages_required  text[] not null default '{}',
  experience_required int not null default 0,
  status              job_status not null default 'draft',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  published_at        timestamptz
);

create trigger jobs_set_updated_at
  before update on jobs
  for each row execute function set_updated_at();

create index jobs_status_idx       on jobs (status);
create index jobs_industry_idx     on jobs (industry);
create index jobs_employer_idx     on jobs (employer_id);
create index jobs_published_at_idx on jobs (published_at desc);

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------
create table applications (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references jobs (id) on delete cascade,
  candidate_id uuid not null references candidate_profiles (id) on delete cascade,
  status       application_status not null default 'applied',
  cover_note   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (job_id, candidate_id)
);

create trigger applications_set_updated_at
  before update on applications
  for each row execute function set_updated_at();

create index applications_job_idx       on applications (job_id);
create index applications_candidate_idx on applications (candidate_id);

-- ---------------------------------------------------------------------------
-- saved_jobs
-- ---------------------------------------------------------------------------
create table saved_jobs (
  candidate_id uuid not null references candidate_profiles (id) on delete cascade,
  job_id       uuid not null references jobs (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (candidate_id, job_id)
);

-- ===========================================================================
-- Row-Level Security
-- ===========================================================================
alter table profiles            enable row level security;
alter table candidate_profiles  enable row level security;
alter table employer_profiles   enable row level security;
alter table jobs                enable row level security;
alter table applications        enable row level security;
alter table saved_jobs          enable row level security;

-- profiles: a user manages only their own row.
create policy "profiles: select own"
  on profiles for select using (auth.uid() = id);
create policy "profiles: update own"
  on profiles for update using (auth.uid() = id);

-- candidate_profiles: owner full access; any authenticated user (employers) may
-- read for talent discovery.
create policy "candidates: read for authenticated"
  on candidate_profiles for select to authenticated using (true);
create policy "candidates: insert own"
  on candidate_profiles for insert with check (auth.uid() = id);
create policy "candidates: update own"
  on candidate_profiles for update using (auth.uid() = id);

-- employer_profiles: public read (job seekers browse companies); owner writes.
create policy "employers: public read"
  on employer_profiles for select using (true);
create policy "employers: insert own"
  on employer_profiles for insert with check (auth.uid() = id);
create policy "employers: update own"
  on employer_profiles for update using (auth.uid() = id);

-- jobs: published jobs are public; an employer fully manages their own jobs.
create policy "jobs: public read published"
  on jobs for select using (status = 'published');
create policy "jobs: owner read all"
  on jobs for select using (auth.uid() = employer_id);
create policy "jobs: owner insert"
  on jobs for insert with check (auth.uid() = employer_id);
create policy "jobs: owner update"
  on jobs for update using (auth.uid() = employer_id);
create policy "jobs: owner delete"
  on jobs for delete using (auth.uid() = employer_id);

-- applications: candidate manages own; employer reads applications to their jobs.
create policy "applications: candidate read own"
  on applications for select using (auth.uid() = candidate_id);
create policy "applications: employer read for own jobs"
  on applications for select using (
    exists (
      select 1 from jobs
      where jobs.id = applications.job_id and jobs.employer_id = auth.uid()
    )
  );
create policy "applications: candidate insert own"
  on applications for insert with check (auth.uid() = candidate_id);
create policy "applications: candidate update own"
  on applications for update using (auth.uid() = candidate_id);
create policy "applications: employer update for own jobs"
  on applications for update using (
    exists (
      select 1 from jobs
      where jobs.id = applications.job_id and jobs.employer_id = auth.uid()
    )
  );

-- saved_jobs: owner only.
create policy "saved_jobs: manage own"
  on saved_jobs for all using (auth.uid() = candidate_id)
  with check (auth.uid() = candidate_id);

-- ============================================================
-- 0002_storage.sql
-- ============================================================
-- SHIFTED — storage buckets for profile & company media.
-- Run after 0001_init.sql.
--
-- Path convention: every object is stored under the owner's user id as the first
-- folder segment, i.e. `${auth.uid()}/<file>`. RLS keys off that segment.

-- ---------------------------------------------------------------------------
-- Buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('avatars',   'avatars',   true),   -- candidate / user avatars
  ('portfolio', 'portfolio', true),   -- candidate portfolio images
  ('company',   'company',   true),   -- employer logo, cover, workplace photos
  ('resumes',   'resumes',   false)   -- private: owner-only (signed URLs)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Helper: object is owned by the current user (first path segment = uid)
-- ---------------------------------------------------------------------------
-- (storage.foldername(name))[1] is the first folder in the object path.

-- Public-readable image buckets ---------------------------------------------
create policy "media public read"
  on storage.objects for select
  using (bucket_id in ('avatars', 'portfolio', 'company'));

create policy "media owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'portfolio', 'company')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "media owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('avatars', 'portfolio', 'company')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "media owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('avatars', 'portfolio', 'company')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Private resumes — owner only (read via signed URL) -------------------------
create policy "resumes owner all"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- 0003_staff.sql
-- ============================================================
-- SHIFTED — staff records.
-- Employer-owned staff/payroll records (the people an employer already employs),
-- distinct from candidate accounts. Foundation for the Payroll / HR roadmap.
-- Run after 0001_init.sql.

create table staff (
  id          uuid primary key default gen_random_uuid(),
  employer_id uuid not null references employer_profiles (id) on delete cascade,
  full_name   text not null,
  role_title  text,
  net_salary  int,                       -- latest known net pay
  currency    text not null default 'THB',
  period      text,                       -- latest payslip period, e.g. '2026-04'
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (employer_id, full_name)
);

create trigger staff_set_updated_at
  before update on staff
  for each row execute function set_updated_at();

create index staff_employer_idx on staff (employer_id);

alter table staff enable row level security;

-- Only the owning employer can see or manage their staff records (payroll is private).
create policy "staff: manage own"
  on staff for all
  using (auth.uid() = employer_id)
  with check (auth.uid() = employer_id);

-- ============================================================
-- 0004_grants.sql
-- ============================================================
-- SHIFTED — grant the Supabase API roles access to the public schema.
-- Needed on projects where default privileges weren't applied to the API roles
-- (observed with the new sb_publishable_/sb_secret_ key system): without this,
-- the data API returns "42501 permission denied for table ...".
--
-- Row-Level Security still governs what `anon` / `authenticated` can actually
-- read or write — these are table-level privileges only. `service_role` bypasses
-- RLS (used server-side, e.g. the seed script).

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions  in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;

-- ============================================================
-- 0005_reputation.sql
-- ============================================================
-- SHIFTED — reputation core: engagements + two-way reviews + reliability.
-- The moat: verified work history and ratings gated to real completed work.
-- Run after 0001–0004.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type engagement_status as enum ('active', 'completed', 'cancelled');
create type attendance_status as enum ('pending', 'on_time', 'late', 'no_show');
create type review_kind as enum ('of_worker', 'of_employer');

-- ---------------------------------------------------------------------------
-- engagements — a worker did a job for an employer
-- ---------------------------------------------------------------------------
create table engagements (
  id           uuid primary key default gen_random_uuid(),
  employer_id  uuid not null references employer_profiles (id) on delete cascade,
  worker_id    uuid not null references candidate_profiles (id) on delete cascade,
  job_id       uuid references jobs (id) on delete set null,
  role_title   text,
  status       engagement_status not null default 'active',
  attendance   attendance_status not null default 'pending',
  started_on   date,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (employer_id, worker_id, job_id)
);

create trigger engagements_set_updated_at
  before update on engagements
  for each row execute function set_updated_at();

create index engagements_employer_idx on engagements (employer_id);
create index engagements_worker_idx   on engagements (worker_id);
create index engagements_status_idx   on engagements (status);

-- ---------------------------------------------------------------------------
-- reviews — one per party per engagement, two-way
-- ---------------------------------------------------------------------------
create table reviews (
  id            uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements (id) on delete cascade,
  author_id     uuid not null,            -- auth.uid() of the reviewer
  subject_id    uuid not null,            -- auth.uid() of the reviewed party
  kind          review_kind not null,     -- whether the subject is the worker or employer
  rating        int not null check (rating between 1 and 5),
  comment       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (engagement_id, author_id)
);

create trigger reviews_set_updated_at
  before update on reviews
  for each row execute function set_updated_at();

create index reviews_subject_idx    on reviews (subject_id);
create index reviews_engagement_idx on reviews (engagement_id);

-- ---------------------------------------------------------------------------
-- Aggregate columns on the profiles
-- ---------------------------------------------------------------------------
alter table candidate_profiles add column rating_avg numeric(3, 2);
alter table candidate_profiles add column rating_count int not null default 0;
-- candidate_profiles.reliability_score (int, 0-100) already exists from 0001.

alter table employer_profiles add column rating_avg numeric(3, 2);
alter table employer_profiles add column rating_count int not null default 0;

-- ---------------------------------------------------------------------------
-- Aggregate maintenance
-- ---------------------------------------------------------------------------
create or replace function refresh_review_aggregates(uid uuid)
returns void language plpgsql as $$
begin
  update candidate_profiles c set
    rating_avg = a.avg, rating_count = a.cnt
  from (
    select round(avg(rating)::numeric, 2) as avg, count(*) as cnt
    from reviews where subject_id = uid and kind = 'of_worker'
  ) a where c.id = uid;

  update employer_profiles e set
    rating_avg = a.avg, rating_count = a.cnt
  from (
    select round(avg(rating)::numeric, 2) as avg, count(*) as cnt
    from reviews where subject_id = uid and kind = 'of_employer'
  ) a where e.id = uid;
end;
$$;

-- Worker reliability: % of completed engagements where the worker showed up.
create or replace function refresh_reliability(uid uuid)
returns void language plpgsql as $$
begin
  update candidate_profiles c set reliability_score = a.score
  from (
    select case
      when count(*) filter (where status = 'completed') = 0 then null
      else round(
        100.0 * count(*) filter (where status = 'completed' and attendance in ('on_time', 'late'))
        / count(*) filter (where status = 'completed')
      )::int
    end as score
    from engagements where worker_id = uid
  ) a where c.id = uid;
end;
$$;

create or replace function trg_reviews_aggregates()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform refresh_review_aggregates(old.subject_id);
    return old;
  end if;
  perform refresh_review_aggregates(new.subject_id);
  if tg_op = 'UPDATE' and new.subject_id <> old.subject_id then
    perform refresh_review_aggregates(old.subject_id);
  end if;
  return new;
end;
$$;

create trigger reviews_aggregates
  after insert or update or delete on reviews
  for each row execute function trg_reviews_aggregates();

create or replace function trg_engagements_reliability()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform refresh_reliability(old.worker_id);
    return old;
  end if;
  perform refresh_reliability(new.worker_id);
  if tg_op = 'UPDATE' and new.worker_id <> old.worker_id then
    perform refresh_reliability(old.worker_id);
  end if;
  return new;
end;
$$;

create trigger engagements_reliability
  after insert or update or delete on engagements
  for each row execute function trg_engagements_reliability();

-- ===========================================================================
-- Row-Level Security
-- ===========================================================================
alter table engagements enable row level security;
alter table reviews     enable row level security;

-- engagements: employer manages their own; worker can read their own.
create policy "engagements: employer manage own"
  on engagements for all
  using (auth.uid() = employer_id)
  with check (auth.uid() = employer_id);
create policy "engagements: worker read own"
  on engagements for select
  using (auth.uid() = worker_id);

-- reviews: publicly readable (shown on profiles).
create policy "reviews: public read"
  on reviews for select using (true);

-- reviews: a party may insert exactly one review of the OTHER party, only on a
-- completed engagement they belong to.
create policy "reviews: party insert on completed engagement"
  on reviews for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from engagements e
      where e.id = engagement_id
        and e.status = 'completed'
        and (
          (auth.uid() = e.employer_id and subject_id = e.worker_id   and kind = 'of_worker')
          or
          (auth.uid() = e.worker_id   and subject_id = e.employer_id and kind = 'of_employer')
        )
    )
  );

create policy "reviews: author update own"
  on reviews for update using (auth.uid() = author_id);

-- ---------------------------------------------------------------------------
-- Grants (explicit, in case default privileges don't cover new tables)
-- ---------------------------------------------------------------------------
grant all on engagements to anon, authenticated, service_role;
grant all on reviews      to anon, authenticated, service_role;

-- ============================================================
-- 0006_unified_account.sql
-- ============================================================
-- SHIFTED — unified account.
-- One account can hold BOTH a candidate (worker) and an employer profile.
-- `active_view` remembers which side the toggle is on; capability is derived
-- from which profile rows exist. `profiles.role` is kept for back-compat/admin
-- but no longer enforces exclusivity.
-- Run after 0001–0005.

create type account_view as enum ('worker', 'employer');

alter table profiles add column active_view account_view;

-- Backfill from the existing single role.
update profiles
set active_view = case when role = 'employer' then 'employer'::account_view
                       else 'worker'::account_view end
where active_view is null and role is not null;

-- ============================================================
-- 0007_verification.sql
-- ============================================================
-- SHIFTED — 4-level verified screening (the core differentiator).
-- Candidates progress through 4 sequential levels; an admin reviews each.
-- A visible verification_level (0–4) reflects the highest *contiguous* approved
-- level. Run after 0001–0006.

create type verification_item_status as enum ('submitted', 'approved', 'rejected');

-- Admin flag (kept separate from `role` so it composes with worker/employer).
alter table profiles add column is_admin boolean not null default false;

create or replace function is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and is_admin);
$$;

-- Highest contiguous approved level lives on the candidate for fast filtering.
alter table candidate_profiles add column verification_level int not null default 0;

create table verification_submissions (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidate_profiles (id) on delete cascade,
  level        int  not null check (level between 1 and 4),
  status       verification_item_status not null default 'submitted',
  details      text,
  evidence     jsonb not null default '{}',
  documents    text[] not null default '{}',   -- private 'verification' bucket paths
  reviewer_id  uuid,
  review_note  text,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (candidate_id, level)
);

create trigger verification_submissions_set_updated_at
  before update on verification_submissions
  for each row execute function set_updated_at();

create index verification_submissions_status_idx    on verification_submissions (status);
create index verification_submissions_candidate_idx on verification_submissions (candidate_id);

-- Recompute the badge: highest L such that levels 1..L are all approved.
create or replace function refresh_verification_level(uid uuid)
returns void language plpgsql as $$
declare lvl int := 0; i int;
begin
  for i in 1..4 loop
    if exists (
      select 1 from verification_submissions
      where candidate_id = uid and level = i and status = 'approved'
    ) then
      lvl := i;
    else
      exit;
    end if;
  end loop;
  update candidate_profiles set verification_level = lvl where id = uid;
end;
$$;

create or replace function trg_verification_level()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform refresh_verification_level(old.candidate_id);
    return old;
  end if;
  perform refresh_verification_level(new.candidate_id);
  return new;
end;
$$;

create trigger verification_level_sync
  after insert or update or delete on verification_submissions
  for each row execute function trg_verification_level();

-- ===========================================================================
-- Row-Level Security
-- ===========================================================================
alter table verification_submissions enable row level security;

-- Candidate: read + submit + edit their own (but not once approved).
create policy "vs: candidate read own"
  on verification_submissions for select using (auth.uid() = candidate_id);
create policy "vs: candidate insert own"
  on verification_submissions for insert with check (auth.uid() = candidate_id);
create policy "vs: candidate update own"
  on verification_submissions for update
  using (auth.uid() = candidate_id and status <> 'approved');

-- Admin: full access to review.
create policy "vs: admin all"
  on verification_submissions for all using (is_admin()) with check (is_admin());

grant all on verification_submissions to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Private storage for verification evidence (owner + admin can read)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('verification', 'verification', false)
on conflict (id) do nothing;

create policy "verification owner+admin read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'verification'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
  );
create policy "verification owner write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verification' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "verification owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'verification' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- 0008_employer_verification.sql
-- ============================================================
-- SHIFTED — 4-layer EMPLOYER verification (both sides get vetted).
-- Mirrors the candidate system: employers earn a trust badge (0–4) by passing
-- Legal → Online → Customer reviews → Peer/partner layers. Workers can filter
-- to verified employers. Run after 0001–0007.

alter table employer_profiles add column verification_level int not null default 0;

create table employer_verification_submissions (
  id           uuid primary key default gen_random_uuid(),
  employer_id  uuid not null references employer_profiles (id) on delete cascade,
  layer        int  not null check (layer between 1 and 4),
  status       verification_item_status not null default 'submitted',
  details      text,
  evidence     jsonb not null default '{}',
  documents    text[] not null default '{}',
  reviewer_id  uuid,
  review_note  text,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (employer_id, layer)
);

create trigger employer_verification_submissions_set_updated_at
  before update on employer_verification_submissions
  for each row execute function set_updated_at();

create index emp_verif_status_idx   on employer_verification_submissions (status);
create index emp_verif_employer_idx on employer_verification_submissions (employer_id);

-- Highest contiguous approved layer; also keep the legacy `verification` flag.
create or replace function refresh_employer_verification_level(uid uuid)
returns void language plpgsql as $$
declare lvl int := 0; i int;
begin
  for i in 1..4 loop
    if exists (
      select 1 from employer_verification_submissions
      where employer_id = uid and layer = i and status = 'approved'
    ) then lvl := i; else exit; end if;
  end loop;
  update employer_profiles
  set verification_level = lvl,
      verification = case when lvl >= 1 then 'verified'::verification_status else verification end
  where id = uid;
end;
$$;

create or replace function trg_employer_verification_level()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform refresh_employer_verification_level(old.employer_id);
    return old;
  end if;
  perform refresh_employer_verification_level(new.employer_id);
  return new;
end;
$$;

create trigger employer_verification_level_sync
  after insert or update or delete on employer_verification_submissions
  for each row execute function trg_employer_verification_level();

-- RLS
alter table employer_verification_submissions enable row level security;

create policy "evs: employer read own"
  on employer_verification_submissions for select using (auth.uid() = employer_id);
create policy "evs: employer insert own"
  on employer_verification_submissions for insert with check (auth.uid() = employer_id);
create policy "evs: employer update own"
  on employer_verification_submissions for update
  using (auth.uid() = employer_id and status <> 'approved');
create policy "evs: admin all"
  on employer_verification_submissions for all using (is_admin()) with check (is_admin());

grant all on employer_verification_submissions to anon, authenticated, service_role;

-- ============================================================
-- 0009_references.sql
-- ============================================================
-- SHIFTED — shared reference network.
-- Employers leave structured references on workers they actually engaged
-- (reliability, would-rehire, no-show, conduct). Visible to other employers as
-- an "avoid bad hires" signal. Run after 0001–0008.

create table hire_references (
  id            uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements (id) on delete cascade,
  worker_id     uuid not null references candidate_profiles (id) on delete cascade,
  employer_id   uuid not null references employer_profiles (id) on delete cascade,
  reliability   int  not null check (reliability between 1 and 5),
  would_rehire  boolean not null default true,
  no_show       boolean not null default false,
  conduct_note  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (engagement_id, employer_id)
);

create trigger hire_references_set_updated_at
  before update on hire_references
  for each row execute function set_updated_at();

create index hire_references_worker_idx on hire_references (worker_id);

-- Aggregate signal lives on the worker for fast display.
alter table candidate_profiles add column reference_count int not null default 0;
alter table candidate_profiles add column would_rehire_count int not null default 0;
alter table candidate_profiles add column no_show_count int not null default 0;

create or replace function refresh_reference_aggregates(uid uuid)
returns void language plpgsql as $$
begin
  update candidate_profiles c set
    reference_count    = a.cnt,
    would_rehire_count = a.rehire,
    no_show_count      = a.noshow
  from (
    select count(*) as cnt,
           count(*) filter (where would_rehire) as rehire,
           count(*) filter (where no_show) as noshow
    from hire_references where worker_id = uid
  ) a where c.id = uid;
end;
$$;

create or replace function trg_reference_aggregates()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform refresh_reference_aggregates(old.worker_id);
    return old;
  end if;
  perform refresh_reference_aggregates(new.worker_id);
  return new;
end;
$$;

create trigger reference_aggregates
  after insert or update or delete on hire_references
  for each row execute function trg_reference_aggregates();

-- RLS
alter table hire_references enable row level security;

-- Shared network: any authenticated user can read references.
create policy "refs: authenticated read"
  on hire_references for select to authenticated using (true);

-- Only an employer who completed an engagement with this worker may write one.
create policy "refs: employer insert on completed engagement"
  on hire_references for insert to authenticated
  with check (
    auth.uid() = employer_id
    and exists (
      select 1 from engagements e
      where e.id = engagement_id
        and e.status = 'completed'
        and e.employer_id = auth.uid()
        and e.worker_id = hire_references.worker_id
    )
  );
create policy "refs: author update own"
  on hire_references for update using (auth.uid() = employer_id);

grant all on hire_references to anon, authenticated, service_role;

-- ============================================================
-- 0010_messaging.sql
-- ============================================================
-- SHIFTED — in-app messaging.
-- One conversation per employer↔worker pair, openable only once a real
-- relationship exists (an application to the employer's job, or an engagement).
-- Run after 0001–0009.

-- May this employer and worker message each other?
create or replace function can_message(p_employer uuid, p_worker uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from applications a
    join jobs j on j.id = a.job_id
    where j.employer_id = p_employer and a.candidate_id = p_worker
  ) or exists (
    select 1 from engagements e
    where e.employer_id = p_employer and e.worker_id = p_worker
  );
$$;

create table conversations (
  id                    uuid primary key default gen_random_uuid(),
  employer_id           uuid not null references employer_profiles (id) on delete cascade,
  worker_id             uuid not null references candidate_profiles (id) on delete cascade,
  job_id                uuid references jobs (id) on delete set null,
  last_message_at       timestamptz not null default now(),
  employer_last_read_at timestamptz,
  worker_last_read_at   timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (employer_id, worker_id)
);

create trigger conversations_set_updated_at
  before update on conversations
  for each row execute function set_updated_at();

create index conversations_employer_idx on conversations (employer_id);
create index conversations_worker_idx   on conversations (worker_id);
create index conversations_activity_idx on conversations (last_message_at desc);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id       uuid not null,
  body            text not null,
  created_at      timestamptz not null default now()
);

create index messages_conversation_idx on messages (conversation_id, created_at);

-- Bump the conversation's activity when a message lands.
create or replace function trg_bump_conversation()
returns trigger language plpgsql as $$
begin
  update conversations set last_message_at = new.created_at, updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_bump_conversation
  after insert on messages
  for each row execute function trg_bump_conversation();

-- Is the current user a participant in this conversation?
create or replace function is_conversation_member(conv uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from conversations c
    where c.id = conv and (c.employer_id = auth.uid() or c.worker_id = auth.uid())
  );
$$;

-- ===========================================================================
-- Row-Level Security
-- ===========================================================================
alter table conversations enable row level security;
alter table messages      enable row level security;

create policy "conversations: member read"
  on conversations for select
  using (auth.uid() = employer_id or auth.uid() = worker_id);

create policy "conversations: member create with relationship"
  on conversations for insert to authenticated
  with check (
    (auth.uid() = employer_id or auth.uid() = worker_id)
    and can_message(employer_id, worker_id)
  );

create policy "conversations: member update"
  on conversations for update
  using (auth.uid() = employer_id or auth.uid() = worker_id);

create policy "messages: member read"
  on messages for select using (is_conversation_member(conversation_id));

create policy "messages: member send"
  on messages for insert to authenticated
  with check (sender_id = auth.uid() and is_conversation_member(conversation_id));

grant all on conversations to anon, authenticated, service_role;
grant all on messages      to anon, authenticated, service_role;

-- ============================================================
-- 0011_monetization.sql
-- ============================================================
-- SHIFTED — monetization stubs.
-- Free for workers; employers pay for reach. Billing is STUBBED — these model
-- the surfaces (plan, boosted jobs, featured employers) so the flows work end
-- to end; payment processing is intentionally out of scope. Run after 0001–0010.

create type plan_tier as enum ('free', 'pro');

alter table employer_profiles add column plan plan_tier not null default 'free';
alter table employer_profiles add column plan_since timestamptz;
alter table employer_profiles add column featured boolean not null default false;

-- A job is "promoted" while boosted_until is in the future.
alter table jobs add column boosted_until timestamptz;

create index jobs_boosted_idx on jobs (boosted_until desc nulls last);

-- ============================================================
-- 0012_skills.sql
-- ============================================================
-- SHIFTED — gamified skill ecosystem (Phase A): skill stacks + worker skills +
-- one-tap employer verification (the linchpin). Run after 0001–0011.
--
-- The catalog is generic: a role (e.g. 'budtender') has tiered skills, some of
-- which award a badge, and one of which can be a "gate" (e.g. compliance) that
-- must be earned before others count. Workers self-declare; the platform or an
-- employer can verify — employer-verified being the highest, portable proof.

create type skill_status as enum ('self_declared', 'platform_verified', 'employer_verified');

-- Catalog --------------------------------------------------------------------
create table skills (
  id         uuid primary key default gen_random_uuid(),
  role       text not null,           -- 'budtender', 'barista', …
  tier       int  not null check (tier between 1 and 4),
  name       text not null,
  slug       text not null,
  badge_name text,                     -- badge earned when verified, if any
  is_gate    boolean not null default false,  -- must be earned before the role counts
  sort       int not null default 0,
  created_at timestamptz not null default now(),
  unique (role, slug)
);

create index skills_role_idx on skills (role, tier, sort);

-- Worker progress ------------------------------------------------------------
create table worker_skills (
  id            uuid primary key default gen_random_uuid(),
  worker_id     uuid not null references candidate_profiles (id) on delete cascade,
  skill_id      uuid not null references skills (id) on delete cascade,
  status        skill_status not null default 'self_declared',
  verified_by   uuid references employer_profiles (id) on delete set null,
  engagement_id uuid references engagements (id) on delete set null,
  verified_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (worker_id, skill_id)
);

create trigger worker_skills_set_updated_at
  before update on worker_skills
  for each row execute function set_updated_at();

create index worker_skills_worker_idx on worker_skills (worker_id);

-- Can this employer endorse this worker's skills?
-- Requires a completed engagement AND a verified business account (fraud guard).
create or replace function can_endorse_skills(p_employer uuid, p_worker uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from engagements e
    where e.employer_id = p_employer and e.worker_id = p_worker and e.status = 'completed'
  ) and exists (
    select 1 from employer_profiles ep
    where ep.id = p_employer and ep.verification_level >= 1
  );
$$;

-- ===========================================================================
-- Row-Level Security
-- ===========================================================================
alter table skills        enable row level security;
alter table worker_skills enable row level security;

-- Catalog is public; only admins edit it.
create policy "skills: public read" on skills for select using (true);
create policy "skills: admin write" on skills for all using (is_admin()) with check (is_admin());

-- Worker skills are public profile data.
create policy "ws: public read" on worker_skills for select using (true);

-- Workers self-declare and manage their own non-verified claims.
create policy "ws: worker self-claim"
  on worker_skills for insert to authenticated
  with check (auth.uid() = worker_id and status = 'self_declared');
create policy "ws: worker update own"
  on worker_skills for update
  using (auth.uid() = worker_id and status <> 'employer_verified');
create policy "ws: worker delete own"
  on worker_skills for delete
  using (auth.uid() = worker_id and status = 'self_declared');

-- Employers (verified businesses) endorse skills for workers they engaged.
create policy "ws: employer verify insert"
  on worker_skills for insert to authenticated
  with check (
    status = 'employer_verified'
    and verified_by = auth.uid()
    and can_endorse_skills(auth.uid(), worker_id)
  );
create policy "ws: employer verify update"
  on worker_skills for update
  using (can_endorse_skills(auth.uid(), worker_id))
  with check (status = 'employer_verified' and verified_by = auth.uid());

create policy "ws: admin all" on worker_skills for all using (is_admin()) with check (is_admin());

grant all on skills        to anon, authenticated, service_role;
grant all on worker_skills to anon, authenticated, service_role;

-- ============================================================
-- 0013_verify_prompts.sql
-- ============================================================
-- SHIFTED — prompt-driven one-tap verification + employer accountability score.
-- Completing an engagement generates verification prompts for milestone skills;
-- the employer confirms/declines in one tap. Auto-verifiable skills are
-- confirmed by the system. An employer's response rate becomes a public
-- accountability signal. Run after 0001–0012.
--
-- Stubs (need external infra): push notifications → in-app inbox; POS/clock-out
-- → engagement completion; geo/device capture → nullable columns.

-- How a skill's badge gets verified.
alter table skills add column verify_method text not null default 'none';
-- 'none' = no badge/prompt · 'manual' = needs a human tap · 'auto' = system-proven

create type prompt_status as enum ('pending', 'confirmed', 'declined', 'disputed');
create type verify_source as enum ('manual', 'auto_pos', 'auto_attendance');

create table verification_prompts (
  id            uuid primary key default gen_random_uuid(),
  worker_id     uuid not null references candidate_profiles (id) on delete cascade,
  employer_id   uuid not null references employer_profiles (id) on delete cascade,
  manager_id    uuid,                       -- who responded
  skill_id      uuid not null references skills (id) on delete cascade,
  engagement_id uuid references engagements (id) on delete set null,
  badge_type    text,
  status        prompt_status not null default 'pending',
  method        verify_source not null default 'manual',
  note          text,
  geo           text,                        -- venue geo at response (future)
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  unique (engagement_id, skill_id)
);

create index vp_employer_status_idx on verification_prompts (employer_id, status);
create index vp_worker_idx          on verification_prompts (worker_id);

-- Employer accountability (feedback responsiveness).
alter table employer_profiles add column response_rate numeric;          -- 0..1, null until eligible
alter table employer_profiles add column prompts_eligible int not null default 0;
alter table employer_profiles add column prompts_responded int not null default 0;
alter table employer_profiles add column responsiveness_since timestamptz default now(); -- onboarding grace anchor

-- Rolling-30-day response rate. Auto prompts don't count (don't punish managers
-- for data the system already has). Responded = confirmed/declined within 48h.
create or replace function refresh_employer_responsiveness(uid uuid)
returns void language plpgsql as $$
begin
  update employer_profiles e set
    prompts_eligible  = a.elig,
    prompts_responded = a.resp,
    response_rate     = case when a.elig = 0 then null
                             else round(a.resp::numeric / a.elig, 2) end
  from (
    select
      count(*) filter (
        where method = 'manual' and created_at > now() - interval '30 days'
      ) as elig,
      count(*) filter (
        where method = 'manual' and created_at > now() - interval '30 days'
          and status in ('confirmed', 'declined')
          and responded_at is not null
          and responded_at <= created_at + interval '48 hours'
      ) as resp
    from verification_prompts where employer_id = uid
  ) a
  where e.id = uid;
end;
$$;

create or replace function trg_prompt_responsiveness()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform refresh_employer_responsiveness(old.employer_id);
    return old;
  end if;
  perform refresh_employer_responsiveness(new.employer_id);
  return new;
end;
$$;

create trigger prompt_responsiveness
  after insert or update or delete on verification_prompts
  for each row execute function trg_prompt_responsiveness();

-- ===========================================================================
-- Row-Level Security
-- ===========================================================================
alter table verification_prompts enable row level security;

create policy "vp: employer manage own"
  on verification_prompts for all
  using (auth.uid() = employer_id)
  with check (auth.uid() = employer_id);

create policy "vp: worker read own"
  on verification_prompts for select using (auth.uid() = worker_id);

-- Worker may dispute a confirmed badge (only flip confirmed → disputed).
create policy "vp: worker dispute"
  on verification_prompts for update
  using (auth.uid() = worker_id and status = 'confirmed')
  with check (auth.uid() = worker_id and status = 'disputed');

create policy "vp: admin all"
  on verification_prompts for all using (is_admin()) with check (is_admin());

grant all on verification_prompts to anon, authenticated, service_role;

-- ============================================================
-- 0014_archetypes.sql
-- ============================================================
-- SHIFTED — workforce archetypes (Phase B entry layer).
-- A behavioral archetype derived from a short assessment; re-testable.
-- Stored on the worker profile; the fit engine lives in app code (lib/archetypes).
-- Run after 0001–0013.

alter table candidate_profiles add column archetype text;
alter table candidate_profiles add column archetype_scores jsonb;
alter table candidate_profiles add column archetype_taken_at timestamptz;

create index candidate_profiles_archetype_idx on candidate_profiles (archetype);

-- ============================================================
-- 0015_outcomes.sql
-- ============================================================
-- SHIFTED — outcome-aligned pricing (the wedge vs Indeed's CPC) + post-hire
-- retention milestones. Employers are billed on OUTCOMES (a confirmed hire, then
-- the worker staying to 30/60/90 days), never per click. Billing stays stubbed
-- (events accrue; no charge taken). Run after 0001–0014.

create type billing_event_type as enum (
  'qualified_match',  -- an accepted match (reserved)
  'hire_confirmed',   -- a placement: engagement started
  'retention_30',     -- worker stayed 30 days
  'retention_60',
  'retention_90'
);

create type billing_event_status as enum ('pending', 'invoiced', 'waived');

create table billing_events (
  id            uuid primary key default gen_random_uuid(),
  employer_id   uuid not null references employer_profiles (id) on delete cascade,
  worker_id     uuid references candidate_profiles (id) on delete set null,
  engagement_id uuid references engagements (id) on delete set null,
  type          billing_event_type not null,
  amount_thb    int not null default 0,
  status        billing_event_status not null default 'pending',
  occurred_at   timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  unique (engagement_id, type)
);

create index billing_events_employer_idx on billing_events (employer_id, occurred_at desc);

alter table billing_events enable row level security;

create policy "be: employer read own"
  on billing_events for select using (auth.uid() = employer_id);
create policy "be: employer insert own"
  on billing_events for insert to authenticated with check (auth.uid() = employer_id);
create policy "be: admin all"
  on billing_events for all using (is_admin()) with check (is_admin());

grant all on billing_events to anon, authenticated, service_role;

-- ============================================================
-- 0016_plan_tiers.sql
-- ============================================================
-- SHIFTED — add the Growth subscription tier (per CLAUDE.md: Free / Starter
-- ฿990 / Growth ฿2,490). The existing 'pro' value is the Starter tier.
-- Run after 0001–0015.

alter type plan_tier add value if not exists 'growth';

-- ============================================================
-- 0017_reputation_v2.sql
-- ============================================================
-- SHIFTED — Worker Reputation System v1.
-- Objective behaviour dominates; subjective stars are a minor input. Protect the
-- scarce worker side: a low score reduces ranking and shows a recovery panel —
-- it never bans. Suspension is for verified misconduct only (incl. 3+ no-shows).
-- Thresholds (35/60), weights, and the 90-day window are test hypotheses.
-- Run after 0001–0016.

alter table candidate_profiles add column reputation_state text not null default 'building';
alter table candidate_profiles add column rated_shifts int not null default 0;

-- Reliability = 100 − no_show%×50 − late_cancel%×25 − late_arrival%×10 + star_adj,
-- over a rolling 90-day window. Stars: (avg−3)/2×15, ±15 max.
create or replace function refresh_reliability(uid uuid)
returns void language plpgsql as $$
declare
  win   interval := interval '90 days';
  n     int;        -- shift outcomes in window
  ns    int;        -- no-shows
  la    int;        -- late arrivals
  lc    int;        -- late cancels (cancelled engagements)
  total int;
  ravg  numeric;
  rcnt  int;
  star_adj numeric := 0;
  score int;
  st    text;
begin
  select
    count(*) filter (where attendance in ('on_time', 'late', 'no_show')),
    count(*) filter (where attendance = 'no_show'),
    count(*) filter (where attendance = 'late')
  into n, ns, la
  from engagements
  where worker_id = uid and status = 'completed'
    and coalesce(completed_at, created_at) > now() - win;

  select count(*) into lc from engagements
  where worker_id = uid and status = 'cancelled'
    and coalesce(updated_at, created_at) > now() - win;

  total := coalesce(n, 0) + coalesce(lc, 0);

  select rating_avg, rating_count into ravg, rcnt
  from candidate_profiles where id = uid;
  if coalesce(rcnt, 0) > 0 and ravg is not null then
    star_adj := (ravg - 3.0) / 2.0 * 15;
  end if;

  if total = 0 then
    update candidate_profiles
      set reliability_score = null, rated_shifts = 0, reputation_state = 'building'
      where id = uid;
    return;
  end if;

  score := round(
    100
    - (ns::numeric / total) * 50
    - (lc::numeric / total) * 25
    - (la::numeric / total) * 10
    + star_adj
  );
  score := greatest(0, least(100, score));

  -- State machine. 3+ no-shows in window = a verified objective violation.
  if coalesce(ns, 0) >= 3 then st := 'suspended';
  elsif total < 5 then st := 'building';        -- minimum sample gate
  elsif score >= 60 then st := 'active';
  else st := 'at_risk';                          -- 35–59: reduced ranking, recovery
  end if;

  update candidate_profiles
    set reliability_score = score, rated_shifts = total, reputation_state = st
    where id = uid;
end;
$$;

-- Reviews change the star input → also refresh reliability for the worker.
create or replace function trg_reviews_aggregates()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform refresh_review_aggregates(old.subject_id);
    perform refresh_reliability(old.subject_id);
    return old;
  end if;
  perform refresh_review_aggregates(new.subject_id);
  perform refresh_reliability(new.subject_id);
  if tg_op = 'UPDATE' and new.subject_id <> old.subject_id then
    perform refresh_review_aggregates(old.subject_id);
    perform refresh_reliability(old.subject_id);
  end if;
  return new;
end;
$$;

-- Backfill all existing workers under the new model.
do $$
declare r record;
begin
  for r in select id from candidate_profiles loop
    perform refresh_reliability(r.id);
  end loop;
end $$;

-- ============================================================
-- 0018_employer_compliance.sql
-- ============================================================
-- SHIFTED — employer hiring-compliance self-attestation.
-- An employer works through the Thailand hiring document-trail checklist
-- (RD / SSO / DLPW / DOE) and self-attests which obligations they meet. The
-- ticked items + context flags drive a compliance score and a public,
-- clearly-labelled "self-attested" trust badge that workers can see.
-- Run after 0001–0017.

alter table employer_profiles
  add column if not exists compliance_items text[] not null default '{}',
  add column if not exists compliance_foreign_hires boolean not null default false,
  add column if not exists compliance_headcount_10plus boolean not null default false,
  add column if not exists compliance_attested_at timestamptz;

-- compliance_items holds the checklist keys the employer has marked done.
-- It lives on employer_profiles, which already has: public SELECT (workers
-- browse companies and see the badge) + owner-only UPDATE. No new policy needed.

comment on column employer_profiles.compliance_items is
  'Self-attested hiring-compliance checklist keys (see lib/compliance.ts COMPLIANCE_GROUPS).';
comment on column employer_profiles.compliance_attested_at is
  'When the employer last confirmed their compliance self-attestation.';

-- ============================================================
-- 0019_trust_circle.sql
-- ============================================================
-- SHIFTED — TRUST CIRCLE (tc_*): premium employer-to-employer workforce
-- referral network. From TRUST_CIRCLE_BUILD_SPEC.md. The spec's non-negotiable
-- rules are enforced here as CODE (constraints + RLS + security-definer
-- functions), not policy. Fail closed everywhere. Run after 0001–0018.
--
-- Invariants baked in:
--   1. Consent gate   — no worker data is returned by any network read unless an
--      active consent row covers that scope. Enforced in the read functions AND
--      by withholding any broad table-level SELECT policy for members.
--   2. No sensitive    — no health/criminal/religion/etc. column exists at all.
--   3. No compensation — no salary/wage/pay column exists at all.
--   4. No free-text about workers — endorsements/references are fixed scales only.
--      The ONLY free-text column (tc_worker_response.body) belongs to the worker.
--   5. Audit-on-read   — every network read goes through a function that writes a
--      worker-visible tc_access_log row in the same transaction. No silent reads.
--   6. Revocable       — withdrawing consent flips visibility off immediately for
--      future queries; the access log is retained.

-- ── enums ──────────────────────────────────────────────────────────────────
create type tc_member_status  as enum ('pending', 'probation', 'active', 'suspended', 'exited');
create type tc_member_tier    as enum ('growth', 'trust_circle');
create type tc_consent_scope  as enum ('pool_discoverable', 'reference_sharing', 'endorsement_visible');
create type tc_consent_status as enum ('active', 'withdrawn');
create type tc_ref_status     as enum ('pending', 'answered', 'declined', 'blocked_no_consent');
create type tc_response_target as enum ('endorsement', 'reference');
create type tc_access_action  as enum ('search_hit', 'view_profile', 'view_endorsement', 'view_reference');

-- ── tc_member ───────────────────────────────────────────────────────────────
create table tc_member (
  id              uuid primary key default gen_random_uuid(),
  employer_id     uuid not null unique references employer_profiles (id) on delete cascade,
  status          tc_member_status not null default 'pending',
  ndsca_signed_at timestamptz,                 -- null = NO network access
  ndsca_version   text,
  tier            tc_member_tier not null default 'growth',
  trust_score     numeric,                     -- member-side rating, later phase
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger tc_member_set_updated_at before update on tc_member
  for each row execute function set_updated_at();

-- ── tc_worker_consent — the spine / source of truth for visibility ───────────
create table tc_worker_consent (
  id          uuid primary key default gen_random_uuid(),
  worker_id   uuid not null references candidate_profiles (id) on delete cascade,
  scope       tc_consent_scope not null,
  status      tc_consent_status not null default 'active',
  granted_at  timestamptz not null default now(),
  withdrawn_at timestamptz,
  granted_via text,
  unique (worker_id, scope)
);
create index tc_consent_lookup_idx on tc_worker_consent (worker_id, scope, status);

-- ── tc_endorsement — structured-only; NO free text, NO comp ──────────────────
create table tc_endorsement (
  id                 uuid primary key default gen_random_uuid(),
  worker_id          uuid not null references candidate_profiles (id) on delete cascade,
  member_id          uuid not null references tc_member (id) on delete cascade,
  role_confirmed     text not null,            -- factual job title
  employed_from      date,
  employed_to        date,
  rating_reliability smallint not null check (rating_reliability between 1 and 5),
  rating_skill       smallint not null check (rating_skill between 1 and 5),
  rating_teamwork    smallint not null check (rating_teamwork between 1 and 5),
  rating_punctuality smallint not null check (rating_punctuality between 1 and 5),
  would_rehire       boolean not null,
  created_at         timestamptz not null default now(),
  unique (worker_id, member_id)
);
create index tc_endorsement_worker_idx on tc_endorsement (worker_id);

-- ── tc_reference_request ─────────────────────────────────────────────────────
create table tc_reference_request (
  id                   uuid primary key default gen_random_uuid(),
  worker_id            uuid not null references candidate_profiles (id) on delete cascade,
  requesting_member_id uuid not null references tc_member (id) on delete cascade,
  responding_member_id uuid references tc_member (id) on delete set null,
  status               tc_ref_status not null default 'pending',
  consent_id           uuid references tc_worker_consent (id) on delete set null,
  role_confirmed       text,
  rating_reliability   smallint check (rating_reliability between 1 and 5),
  rating_skill         smallint check (rating_skill between 1 and 5),
  rating_teamwork      smallint check (rating_teamwork between 1 and 5),
  rating_punctuality   smallint check (rating_punctuality between 1 and 5),
  would_rehire         boolean,
  answered_at          timestamptz,
  created_at           timestamptz not null default now()
);
create index tc_refreq_worker_idx on tc_reference_request (worker_id);

-- ── tc_worker_response — the worker's right-to-respond (only free text) ───────
create table tc_worker_response (
  id          uuid primary key default gen_random_uuid(),
  worker_id   uuid not null references candidate_profiles (id) on delete cascade,
  target_type tc_response_target not null,
  target_id   uuid not null,
  body        text not null,                   -- worker-authored, the ONLY free text
  created_at  timestamptz not null default now()
);
create index tc_response_target_idx on tc_worker_response (target_type, target_id);

-- ── tc_access_log — every network read; worker-visible ───────────────────────
create table tc_access_log (
  id         uuid primary key default gen_random_uuid(),
  worker_id  uuid not null references candidate_profiles (id) on delete cascade,
  member_id  uuid not null references tc_member (id) on delete cascade,
  action     tc_access_action not null,
  created_at timestamptz not null default now()
);
create index tc_access_worker_idx on tc_access_log (worker_id, created_at desc);

-- ── helper predicates (security definer, stable) ─────────────────────────────
create or replace function tc_member_id(uid uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select id from tc_member where employer_id = uid;
$$;

create or replace function tc_is_member_active(uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from tc_member
    where employer_id = uid and status = 'active' and ndsca_signed_at is not null
  );
$$;

create or replace function tc_can_search(uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from tc_member
    where employer_id = uid and status = 'active'
      and ndsca_signed_at is not null and tier = 'trust_circle'
  );
$$;

-- The visibility predicate used everywhere.
create or replace function tc_has_consent(p_worker uuid, p_scope tc_consent_scope)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from tc_worker_consent
    where worker_id = p_worker and scope = p_scope and status = 'active'
  );
$$;

-- ── consent writes (worker self-service) ─────────────────────────────────────
create or replace function tc_grant_consent(p_scope tc_consent_scope, p_via text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  insert into tc_worker_consent (worker_id, scope, status, granted_at, withdrawn_at, granted_via)
  values (auth.uid(), p_scope, 'active', now(), null, p_via)
  on conflict (worker_id, scope)
  do update set status = 'active', granted_at = now(), withdrawn_at = null, granted_via = excluded.granted_via;
end;
$$;

create or replace function tc_withdraw_consent(p_scope tc_consent_scope)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  update tc_worker_consent
  set status = 'withdrawn', withdrawn_at = now()
  where worker_id = auth.uid() and scope = p_scope;
end;
$$;

-- ── membership writes ─────────────────────────────────────────────────────────
create or replace function tc_join(p_tier tc_member_tier default 'growth')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from employer_profiles where id = auth.uid()) then
    raise exception 'employer profile required';
  end if;
  insert into tc_member (employer_id, status, tier)
  values (auth.uid(), 'probation', p_tier)
  on conflict (employer_id) do nothing;
end;
$$;

create or replace function tc_sign_ndsca(p_version text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update tc_member
  set ndsca_signed_at = now(), ndsca_version = p_version,
      status = case when status in ('pending','probation') then 'active' else status end
  where employer_id = auth.uid();
end;
$$;

-- MVP: premium tier is a stubbed self-upgrade (no payment), like plan upgrades.
create or replace function tc_set_tier(p_tier tc_member_tier)
returns void language plpgsql security definer set search_path = public as $$
begin
  update tc_member set tier = p_tier where employer_id = auth.uid();
end;
$$;

-- ── endorsement create — allowlisted structured fields only ──────────────────
-- The function signature IS the allowlist: there is no free-text / comp param.
create or replace function tc_create_endorsement(
  p_worker uuid, p_role text, p_from date, p_to date,
  p_reliability smallint, p_skill smallint, p_teamwork smallint, p_punctuality smallint,
  p_would_rehire boolean
) returns uuid language plpgsql security definer set search_path = public as $$
declare m uuid; new_id uuid;
begin
  m := tc_member_id(auth.uid());
  if m is null or not tc_is_member_active(auth.uid()) then
    raise exception 'active Trust Circle member required';
  end if;
  -- "a worker they managed": require a completed engagement.
  if not exists (
    select 1 from engagements e
    where e.employer_id = auth.uid() and e.worker_id = p_worker and e.status = 'completed'
  ) then
    raise exception 'you can only endorse a worker you have managed';
  end if;
  insert into tc_endorsement (
    worker_id, member_id, role_confirmed, employed_from, employed_to,
    rating_reliability, rating_skill, rating_teamwork, rating_punctuality, would_rehire
  ) values (
    p_worker, m, p_role, p_from, p_to,
    p_reliability, p_skill, p_teamwork, p_punctuality, p_would_rehire
  )
  on conflict (worker_id, member_id) do update set
    role_confirmed = excluded.role_confirmed, employed_from = excluded.employed_from,
    employed_to = excluded.employed_to, rating_reliability = excluded.rating_reliability,
    rating_skill = excluded.rating_skill, rating_teamwork = excluded.rating_teamwork,
    rating_punctuality = excluded.rating_punctuality, would_rehire = excluded.would_rehire
  returning id into new_id;
  return new_id;
end;
$$;

-- ── reference request / answer ───────────────────────────────────────────────
create or replace function tc_request_reference(p_worker uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare m uuid; c uuid; st tc_ref_status; new_id uuid;
begin
  m := tc_member_id(auth.uid());
  if m is null or not tc_is_member_active(auth.uid()) then
    raise exception 'active Trust Circle member required';
  end if;
  select id into c from tc_worker_consent
    where worker_id = p_worker and scope = 'reference_sharing' and status = 'active';
  st := case when c is null then 'blocked_no_consent'::tc_ref_status else 'pending'::tc_ref_status end;
  insert into tc_reference_request (worker_id, requesting_member_id, status, consent_id)
  values (p_worker, m, st, c) returning id into new_id;
  return new_id;
end;
$$;

create or replace function tc_answer_reference(
  p_request uuid, p_role text,
  p_reliability smallint, p_skill smallint, p_teamwork smallint, p_punctuality smallint,
  p_would_rehire boolean
) returns void language plpgsql security definer set search_path = public as $$
declare m uuid;
begin
  m := tc_member_id(auth.uid());
  if m is null or not tc_is_member_active(auth.uid()) then
    raise exception 'active Trust Circle member required';
  end if;
  update tc_reference_request set
    responding_member_id = m, role_confirmed = p_role,
    rating_reliability = p_reliability, rating_skill = p_skill,
    rating_teamwork = p_teamwork, rating_punctuality = p_punctuality,
    would_rehire = p_would_rehire, status = 'answered', answered_at = now()
  where id = p_request
    and status = 'pending'
    -- only valid while the worker's reference_sharing consent is still active
    and tc_has_consent(worker_id, 'reference_sharing');
end;
$$;

-- ── worker right-to-respond ──────────────────────────────────────────────────
create or replace function tc_respond(p_target_type tc_response_target, p_target_id uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  insert into tc_worker_response (worker_id, target_type, target_id, body)
  values (auth.uid(), p_target_type, p_target_id, p_body);
end;
$$;

-- ── NETWORK READS — consent-gated + audit-logged, atomically ─────────────────
-- Member search of the opted-in pool. Logs a search_hit per returned worker.
create or replace function tc_search(p_role text default null)
returns table (
  worker_id uuid, full_name text, headline text, location text,
  endorsement_count bigint, avg_reliability numeric, would_rehire_count bigint
) language plpgsql security definer set search_path = public as $$
declare m uuid;
begin
  m := tc_member_id(auth.uid());
  if m is null or not tc_can_search(auth.uid()) then return; end if;  -- fail closed

  return query
  with pool as (
    select cp.id, cp.full_name, cp.headline, cp.location
    from candidate_profiles cp
    where tc_has_consent(cp.id, 'pool_discoverable')
      and (p_role is null or cp.headline ilike '%' || p_role || '%')
  ),
  agg as (
    select e.worker_id,
           count(*) as cnt,
           round(avg(e.rating_reliability), 1) as rel,
           count(*) filter (where e.would_rehire) as rehire
    from tc_endorsement e
    where tc_has_consent(e.worker_id, 'endorsement_visible')
    group by e.worker_id
  ),
  hits as (
    select p.id, p.full_name, p.headline, p.location,
           coalesce(a.cnt, 0) as cnt, a.rel, coalesce(a.rehire, 0) as rehire
    from pool p left join agg a on a.worker_id = p.id
  )
  -- audit: one search_hit per worker surfaced (no silent reads)
  , logged as (
    insert into tc_access_log (worker_id, member_id, action)
    select h.id, m, 'search_hit' from hits h
    returning 1
  )
  select h.id, h.full_name, h.headline, h.location, h.cnt, h.rel, h.rehire
  from hits h;
end;
$$;

-- Member views a consented worker's structured endorsements. Logs the read.
create or replace function tc_view_endorsements(p_worker uuid)
returns table (
  id uuid, role_confirmed text, employed_from date, employed_to date,
  rating_reliability smallint, rating_skill smallint, rating_teamwork smallint,
  rating_punctuality smallint, would_rehire boolean, created_at timestamptz
) language plpgsql security definer set search_path = public as $$
declare m uuid;
begin
  m := tc_member_id(auth.uid());
  if m is null or not tc_is_member_active(auth.uid()) then return; end if;       -- fail closed
  if not tc_has_consent(p_worker, 'endorsement_visible') then return; end if;    -- consent gate

  insert into tc_access_log (worker_id, member_id, action) values (p_worker, m, 'view_endorsement');

  return query
  select e.id, e.role_confirmed, e.employed_from, e.employed_to,
         e.rating_reliability, e.rating_skill, e.rating_teamwork,
         e.rating_punctuality, e.would_rehire, e.created_at
  from tc_endorsement e where e.worker_id = p_worker;
end;
$$;

-- ── RLS: default-deny. Members CANNOT select network tables directly — they
--    must go through the logging functions above. Workers see their own data. ─
alter table tc_member            enable row level security;
alter table tc_worker_consent    enable row level security;
alter table tc_endorsement       enable row level security;
alter table tc_reference_request enable row level security;
alter table tc_worker_response   enable row level security;
alter table tc_access_log        enable row level security;

-- Member: owner reads own membership row; admin all.
create policy "tc_member self read"  on tc_member for select using (employer_id = auth.uid() or is_admin());

-- Consent: worker reads/manages own (writes also go via security-definer fns).
create policy "tc_consent self"      on tc_worker_consent for select using (worker_id = auth.uid() or is_admin());

-- Endorsement: only the worker it's about, or the member who wrote it, may read
-- directly. Everyone else (other members) gets it ONLY via tc_view_endorsements.
create policy "tc_endorsement subject/author read" on tc_endorsement for select
  using (worker_id = auth.uid() or member_id = tc_member_id(auth.uid()) or is_admin());

-- Reference request: the worker, and the involved members.
create policy "tc_refreq involved read" on tc_reference_request for select
  using (worker_id = auth.uid()
         or requesting_member_id = tc_member_id(auth.uid())
         or responding_member_id = tc_member_id(auth.uid())
         or is_admin());

-- Worker response: the worker owns it (read + insert).
create policy "tc_response self read" on tc_worker_response for select using (worker_id = auth.uid() or is_admin());

-- Access log: the worker sees every read of their data (full audit visibility).
create policy "tc_access worker read" on tc_access_log for select using (worker_id = auth.uid() or is_admin());

-- ── grants (no anon — fail closed for the logged-out) ────────────────────────
grant select on tc_member, tc_worker_consent, tc_endorsement, tc_reference_request,
  tc_worker_response, tc_access_log to authenticated, service_role;

grant execute on function
  tc_member_id(uuid), tc_is_member_active(uuid), tc_can_search(uuid),
  tc_has_consent(uuid, tc_consent_scope),
  tc_grant_consent(tc_consent_scope, text), tc_withdraw_consent(tc_consent_scope),
  tc_join(tc_member_tier), tc_sign_ndsca(text), tc_set_tier(tc_member_tier),
  tc_create_endorsement(uuid, text, date, date, smallint, smallint, smallint, smallint, boolean),
  tc_request_reference(uuid),
  tc_answer_reference(uuid, text, smallint, smallint, smallint, smallint, boolean),
  tc_respond(tc_response_target, uuid, text),
  tc_search(text), tc_view_endorsements(uuid)
to authenticated, service_role;

-- ============================================================
-- 0020_marketing_leads.sql
-- ============================================================
-- SHIFTED — Marketing Solutions (Booyah) lead capture + attribution.
-- Revenue must stay attributable inside Shifted: capture the lead ON-PLATFORM
-- before handing off to Booyah. Plus a lightweight event log (the repo has no
-- analytics SDK — this is the "instrument metrics" surface from CLAUDE.md).
-- Run after 0001–0019.

create table marketing_leads (
  id              uuid primary key default gen_random_uuid(),
  employer_id     uuid references employer_profiles (id) on delete set null,  -- null if logged out
  business_name   text not null,
  location        text,
  category        text,
  contact_name    text,
  contact_channel text,                                  -- LINE / phone / email value
  interest_tier   text check (interest_tier in ('idol','boss','legend','diy','unsure')),
  message         text,
  source          text not null default 'shifted_marketing_page',
  status          text not null default 'new' check (status in ('new','contacted','won','lost')),
  created_at      timestamptz not null default now()
);
create index marketing_leads_status_idx on marketing_leads (status, created_at desc);

create table marketing_events (
  id          uuid primary key default gen_random_uuid(),
  event       text not null,
  props       jsonb not null default '{}',
  employer_id uuid references employer_profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index marketing_events_event_idx on marketing_events (event, created_at desc);

-- RLS: anyone may SUBMIT a lead or log an event (it's a public capture form);
-- only admins may read leads/events or change lead status. Fail closed otherwise.
alter table marketing_leads  enable row level security;
alter table marketing_events enable row level security;

create policy "ml insert any"   on marketing_leads  for insert with check (true);
create policy "ml admin select" on marketing_leads  for select using (is_admin());
create policy "ml admin update" on marketing_leads  for update using (is_admin()) with check (is_admin());

create policy "me insert any"   on marketing_events for insert with check (true);
create policy "me admin select" on marketing_events for select using (is_admin());

grant insert on marketing_leads, marketing_events to anon, authenticated, service_role;
grant select, update on marketing_leads to authenticated, service_role;
grant select on marketing_events to authenticated, service_role;

-- Sample leads so the admin list demos immediately (no PII; logged-out style).
insert into marketing_leads (business_name, location, category, contact_name, contact_channel, interest_tier, message, status)
values
  ('Sukhumvit Coffee Lab', 'Phrom Phong, Bangkok', 'cafe', 'Ploy', 'LINE: @ploycoffee', 'idol',
   'We get walk-ins but barely show up on Maps. Want the free check.', 'new'),
  ('Thonglor Wellness Spa', 'Thonglor, Bangkok', 'wellness_spa', 'Nattapong', 'email: hello@example.com', 'boss',
   'Opening a second branch — want to own the district.', 'contacted'),
  ('Green Leaf Dispensary', 'Ari, Bangkok', 'cannabis_retail', 'Mook', 'phone: 08x-xxx-xxxx', 'diy',
   'Prefer to start with the Blueprint and DIY first.', 'new');

-- ============================================================
-- 0021_moderation.sql
-- ============================================================
-- SHIFTED — AI moderation engine (SHIFTED_AI_Moderation_Engine.md).
-- Every decision is logged (legal defensibility + worker visibility). Anything
-- attached to a worker's name is visible to that worker — no covert records.
-- Run after 0001–0020.

-- Per-decision audit log. Stores a REDACTED excerpt only — never the raw
-- sensitive/PII payload (PDPA data-minimisation).
create table moderation_decisions (
  id               uuid primary key default gen_random_uuid(),
  content_type     text not null,            -- review | response | message | job_post | profile | console
  content_ref      uuid,                     -- the moderated row, if any
  content_hash     text not null,            -- sha256 of the raw content
  excerpt          text,                     -- redacted, human-readable for the queue
  action           text not null check (action in ('ALLOW','SOFTEN','HOLD','BLOCK')),
  confidence       numeric not null default 0.5,
  legal_codes      text[] not null default '{}',
  policy_codes     text[] not null default '{}',
  escalate         boolean not null default false,
  reason_en        text,
  reason_th        text,
  suggested_rewrite text,
  author_id        uuid,                     -- who wrote the content
  target_id        uuid,                     -- the named party it's about (worker visibility)
  model_version    text not null default 'rules-1',
  review_action    text check (review_action in ('allowed','blocked','edited')),
  reviewer_id      uuid,
  reviewed_at      timestamptz,
  appeal_status    text not null default 'none' check (appeal_status in ('none','requested','upheld','overturned')),
  appeal_note      text,
  created_at       timestamptz not null default now()
);
create index moderation_action_idx on moderation_decisions (action, created_at desc);
create index moderation_target_idx on moderation_decisions (target_id);
create index moderation_author_idx on moderation_decisions (author_id);

-- User "Report" submissions (every post/review has a Report button).
create table content_reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid,
  content_type text not null,
  content_ref  uuid,
  reason       text not null,                -- defamation | privacy | harassment | discrimination | fraud | other | appeal
  detail       text,
  status       text not null default 'open' check (status in ('open','reviewed','actioned','dismissed')),
  created_at   timestamptz not null default now()
);
create index content_reports_status_idx on content_reports (status, created_at desc);

-- Review comments now carry a moderation state; only 'allowed'/'softened' show.
alter table reviews
  add column if not exists comment_status text not null default 'allowed'
    check (comment_status in ('allowed','softened','held','blocked'));

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table moderation_decisions enable row level security;
alter table content_reports      enable row level security;

-- Worker visibility: you can see decisions you authored OR that name you. Admin all.
create policy "mod author/target read" on moderation_decisions for select
  using (author_id = auth.uid() or target_id = auth.uid() or is_admin());
-- Decisions are written server-side on a logged-in user's action.
create policy "mod insert authed" on moderation_decisions for insert
  with check (auth.uid() is not null);
create policy "mod admin update" on moderation_decisions for update
  using (is_admin()) with check (is_admin());

create policy "report insert authed" on content_reports for insert
  with check (auth.uid() is not null);
create policy "report own/admin read" on content_reports for select
  using (reporter_id = auth.uid() or is_admin());
create policy "report admin update" on content_reports for update
  using (is_admin()) with check (is_admin());

grant select, insert on moderation_decisions to authenticated, service_role;
grant update on moderation_decisions to authenticated, service_role;
grant select, insert on content_reports to authenticated, service_role;
grant update on content_reports to authenticated, service_role;

-- ============================================================
-- 0022_matching.sql
-- ============================================================
-- SHIFTED — categorization & matching (SHIFTED_Categorization_Matching_Spec.md).
-- Adds the structured, OPTIONAL taxonomy fields both sides can fill so matching
-- is apples-to-apples. Everything is nullable — the matcher degrades gracefully
-- and never blocks on a missing field. Run after 0001–0021.
--
-- Compliance §7 (PDPA): worker precise lat/lng and age are NOT stored on the
-- public candidate_profiles row. Job venue lat/lng is fine (business location).
-- Commute therefore matches on coarse district for workers — never exact coords.

-- Job side (employer-owned, public).
alter table jobs
  add column if not exists role text,
  add column if not exists district text,
  add column if not exists lat numeric,
  add column if not exists lng numeric,
  add column if not exists days_needed text[] not null default '{}',
  add column if not exists time_blocks_needed text[] not null default '{}',
  add column if not exists hours_per_week int,
  add column if not exists experience_preferred int,
  add column if not exists certs_required text[] not null default '{}',
  add column if not exists min_age int not null default 18,
  add column if not exists work_eligibility_required text not null default 'any';

-- Worker side. NO lat/lng, NO age here (PDPA §7) — district is the public unit.
alter table candidate_profiles
  add column if not exists roles text[] not null default '{}',
  add column if not exists experience_tier int,
  add column if not exists expected_rate_hourly int,
  add column if not exists current_rate_hourly int,
  add column if not exists rate_flexibility_pct int not null default 15,
  add column if not exists residence_district text,
  add column if not exists preferred_districts text[] not null default '{}',
  add column if not exists max_commute_minutes int,
  add column if not exists available_days text[] not null default '{}',
  add column if not exists available_time_blocks text[] not null default '{}',
  add column if not exists desired_hours_per_week int,
  add column if not exists work_eligibility text,
  add column if not exists match_visibility text not null default 'open';

-- Backfill experience tier from existing years_experience (ordinal §1.4).
update candidate_profiles
set experience_tier = case
  when years_experience <= 0 then 1
  when years_experience < 2 then 2
  when years_experience < 5 then 3
  else 4 end
where experience_tier is null;

-- ============================================================
-- 0023_foundation.sql
-- ============================================================
-- SHIFTED — foundation hardening: rate limiting + PDPA data-subject requests.
-- Run after 0001–0022.

-- ── Rate limiting (serverless-safe, DB-backed fixed window) ──────────────────
create table rate_limits (
  key          text not null,
  window_start timestamptz not null,
  count        int not null default 0,
  primary key (key, window_start)
);

-- Returns true if the action is ALLOWED (under the limit), false if throttled.
create or replace function check_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare w timestamptz; c int;
begin
  w := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into rate_limits (key, window_start, count) values (p_key, w, 1)
    on conflict (key, window_start) do update set count = rate_limits.count + 1
    returning count into c;
  return c <= p_max;
end;
$$;

-- Only reachable through the function (which is security-definer). No direct access.
alter table rate_limits enable row level security;
grant execute on function check_rate_limit(text, int, int) to anon, authenticated, service_role;

-- ── PDPA data-subject requests (access / deletion) ───────────────────────────
create table data_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles (id) on delete cascade,
  email      text,
  kind       text not null check (kind in ('export', 'delete')),
  status     text not null default 'open' check (status in ('open', 'done', 'rejected')),
  note       text,
  created_at timestamptz not null default now()
);
create index data_requests_status_idx on data_requests (status, created_at desc);

alter table data_requests enable row level security;
create policy "dr insert own"  on data_requests for insert with check (auth.uid() = user_id);
create policy "dr read own"    on data_requests for select using (auth.uid() = user_id or is_admin());
create policy "dr admin update" on data_requests for update using (is_admin()) with check (is_admin());

grant select, insert on data_requests to authenticated, service_role;
grant update on data_requests to authenticated, service_role;

-- ============================================================
-- 0024_rls_hardening.sql
-- ============================================================
-- SHIFTED — RLS hardening (from the security audit, docs/security-audit.md).
-- Several SELECT policies were written `using (true)`, which applies to the
-- logged-OUT `anon` role too — so worker PII and reputation data were readable
-- by anyone holding the public anon key. Restrict these to authenticated users.
-- (employer_profiles + skills stay public by design: companies/skill catalog.)
-- Run after 0001–0023.

-- Worker personal data (name, phone, bio, location) — never anon-readable.
drop policy if exists "candidates: read for authenticated" on candidate_profiles;
create policy "candidates: read for authenticated" on candidate_profiles
  for select using (auth.uid() is not null);

-- Worker reputation references — authenticated only.
drop policy if exists "refs: authenticated read" on hire_references;
create policy "refs: authenticated read" on hire_references
  for select using (auth.uid() is not null);

-- Worker verified-skill records — authenticated only.
drop policy if exists "ws: public read" on worker_skills;
create policy "ws: authenticated read" on worker_skills
  for select using (auth.uid() is not null);

-- Reviews: authenticated only, AND held/blocked comments stay hidden from
-- everyone except the author, the subject, and admins — so moderation outcomes
-- are enforced at the data layer, not just in the UI.
drop policy if exists "reviews: public read" on reviews;
create policy "reviews: gated read" on reviews
  for select using (
    is_admin()
    or author_id = auth.uid()
    or subject_id = auth.uid()
    or (auth.uid() is not null and comment_status in ('allowed', 'softened'))
  );

-- ============================================================
-- 0025_interview_questions.sql
-- ============================================================
-- SHIFTED — custom interview question system (SHIFTED_Platform_Concept_BuildSpec §4.2).
-- The origin feature. CLOSED-BANK ONLY: questions are Shifted-owned objects with
-- fixed answer formats; employers assemble sets but never free-type questions,
-- and applicants answer in fixed formats — no free text about named people.
-- Run after 0001–0024.

create type answer_format as enum ('single_select', 'yes_no', 'scale', 'short_structured');
create type question_category as enum
  ('reliability', 'experience', 'skills', 'availability', 'attitude', 'situational');
create type question_status as enum ('active', 'pending_review', 'rejected');
create type scoring_mode as enum ('none', 'attach', 'rank');

-- Role templates (5 core roles seeded below).
create table role_templates (
  id   uuid primary key default gen_random_uuid(),
  key  text not null unique,
  name text not null,
  sort int not null default 0
);

-- The question bank. role_scope holds role keys the question applies to, plus
-- the sentinel 'all' for cross-role questions. options shape depends on format:
--   single_select / yes_no : [{ "value","label","points" }]
--   scale                  : { "min","max","minLabel","maxLabel" }
--   short_structured       : { "maxLength" }
create table questions (
  id            uuid primary key default gen_random_uuid(),
  role_scope    text[] not null default '{all}',
  category      question_category not null,
  prompt        text not null,
  answer_format answer_format not null,
  options       jsonb not null default '[]',
  is_global     boolean not null default true,
  status        question_status not null default 'active',
  suggested_by  uuid references employer_profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index questions_status_idx on questions (status);

-- A question set attached to one job (arrays of question ids + the required/knockout subset).
create table question_sets (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null unique references jobs (id) on delete cascade,
  question_ids uuid[] not null default '{}',
  required_ids uuid[] not null default '{}',
  scoring_mode scoring_mode not null default 'attach',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger question_sets_set_updated_at before update on question_sets
  for each row execute function set_updated_at();

-- Applicant answers — value references a fixed option/value, plus computed points.
create table answers (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  question_id    uuid not null references questions (id) on delete cascade,
  value          text not null,
  points         int not null default 0,
  created_at     timestamptz not null default now(),
  unique (application_id, question_id)
);
create index answers_application_idx on answers (application_id);

-- Application scoring (the apply flow computes these).
alter table applications
  add column if not exists score int,
  add column if not exists knocked_out boolean not null default false;

-- Lightweight lifecycle metrics sink (§7) — applies, completion, etc.
create table app_events (
  id         uuid primary key default gen_random_uuid(),
  event      text not null,
  props      jsonb not null default '{}',
  actor_id   uuid,
  created_at timestamptz not null default now()
);
create index app_events_event_idx on app_events (event, created_at desc);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table role_templates enable row level security;
alter table questions      enable row level security;
alter table question_sets  enable row level security;
alter table answers        enable row level security;
alter table app_events     enable row level security;

create policy "rt public read" on role_templates for select using (true);

-- Questions: anyone authed sees active ones; an employer sees their own suggestions; admin all.
create policy "q read" on questions for select
  using (status = 'active' or suggested_by = auth.uid() or is_admin());
create policy "q employer suggest" on questions for insert
  with check (suggested_by = auth.uid() and status = 'pending_review' and is_global = false);
create policy "q admin update" on questions for update using (is_admin()) with check (is_admin());

-- Question sets: shown on the public job page (read), written by the job's owner.
create policy "qs public read" on question_sets for select using (true);
create policy "qs owner write" on question_sets for insert
  with check (exists (select 1 from jobs where id = job_id and employer_id = auth.uid()));
create policy "qs owner update" on question_sets for update
  using (exists (select 1 from jobs where id = job_id and employer_id = auth.uid()))
  with check (exists (select 1 from jobs where id = job_id and employer_id = auth.uid()));

-- Answers: the applicant writes/reads own; the job's employer reads; admin all.
create policy "ans insert own" on answers for insert with check (
  exists (select 1 from applications a where a.id = application_id and a.candidate_id = auth.uid())
);
create policy "ans read" on answers for select using (
  exists (select 1 from applications a where a.id = application_id and a.candidate_id = auth.uid())
  or exists (
    select 1 from applications a join jobs j on j.id = a.job_id
    where a.id = application_id and j.employer_id = auth.uid()
  )
  or is_admin()
);

create policy "ae insert authed" on app_events for insert with check (auth.uid() is not null);
create policy "ae admin read" on app_events for select using (is_admin());

grant select on role_templates to anon, authenticated, service_role;
grant select, insert, update on questions to authenticated, service_role;
grant select, insert, update on question_sets to authenticated, service_role;
grant select, insert on answers to authenticated, service_role;
grant insert on app_events to authenticated, service_role;
grant select on app_events to authenticated, service_role;

-- ── Seed: 5 role templates + a categorized closed bank ───────────────────────
insert into role_templates (key, name, sort) values
  ('barista', 'Barista', 1),
  ('bartender', 'Bartender', 2),
  ('server', 'Server / Waitstaff', 3),
  ('retail_sales', 'Retail / Sales associate', 4),
  ('store_manager', 'Store manager', 5);

-- Cross-role questions (role_scope = 'all').
insert into questions (role_scope, category, prompt, answer_format, options) values
  ('{all}', 'availability', 'How many days a week can you work?', 'scale',
    '{"min":1,"max":5,"minLabel":"1 day","maxLabel":"5+ days"}'),
  ('{all}', 'availability', 'Which shifts can you cover?', 'single_select',
    '[{"value":"flexible","label":"Flexible / any","points":2},{"value":"mornings","label":"Mornings","points":1},{"value":"evenings","label":"Evenings","points":1},{"value":"weekends","label":"Weekends only","points":1}]'),
  ('{all}', 'availability', 'When can you start?', 'single_select',
    '[{"value":"now","label":"Immediately","points":2},{"value":"1w","label":"Within 1 week","points":2},{"value":"2w","label":"Within 2 weeks","points":1},{"value":"1m","label":"Within a month","points":0}]'),
  ('{all}', 'reliability', 'Can you reliably commit to your scheduled shifts for at least 3 months?', 'yes_no',
    '[{"value":"yes","label":"Yes","points":2},{"value":"no","label":"No","points":0}]'),
  ('{all}', 'reliability', 'Are you legally eligible to work in Thailand?', 'yes_no',
    '[{"value":"yes","label":"Yes","points":2},{"value":"no","label":"No","points":0}]'),
  ('{all}', 'experience', 'How many years of experience do you have in this kind of role?', 'scale',
    '{"min":1,"max":5,"minLabel":"<1 yr","maxLabel":"5+ yrs"}'),
  ('{all}', 'attitude', 'What matters most to you in a workplace?', 'single_select',
    '[{"value":"team","label":"Team & culture","points":1},{"value":"growth","label":"Growth & learning","points":1},{"value":"stability","label":"Stability & schedule","points":1},{"value":"pay","label":"Pay","points":1}]'),
  ('{all}', 'attitude', 'In one or two lines, why do you want this job?', 'short_structured',
    '{"maxLength":280}');

-- Barista
insert into questions (role_scope, category, prompt, answer_format, options) values
  ('{barista}', 'skills', 'Which best describes your espresso experience?', 'single_select',
    '[{"value":"craft","label":"Specialty / craft café","points":2},{"value":"chain","label":"Chain café","points":1},{"value":"home","label":"Home / hobby only","points":0},{"value":"none","label":"None yet","points":0}]'),
  ('{barista}', 'skills', 'Can you free-pour latte art?', 'yes_no',
    '[{"value":"yes","label":"Yes","points":2},{"value":"no","label":"Not yet","points":0}]'),
  ('{barista}', 'situational', 'It''s a rush and the queue is 8 deep. What do you do first?', 'single_select',
    '[{"value":"triage","label":"Call out orders & set drink priority","points":2},{"value":"speed","label":"Just work faster solo","points":1},{"value":"pause","label":"Pause to reset the station","points":0}]');

-- Bartender
insert into questions (role_scope, category, prompt, answer_format, options) values
  ('{bartender}', 'skills', 'Which best describes your cocktail experience?', 'single_select',
    '[{"value":"craft","label":"Classic & craft cocktails","points":2},{"value":"well","label":"Well drinks / basics","points":1},{"value":"beerwine","label":"Beer & wine only","points":0},{"value":"none","label":"None yet","points":0}]'),
  ('{bartender}', 'skills', 'Do you hold any responsible alcohol-service training?', 'yes_no',
    '[{"value":"yes","label":"Yes","points":2},{"value":"no","label":"No","points":0}]'),
  ('{bartender}', 'situational', 'A visibly intoxicated guest orders another drink. What do you do?', 'single_select',
    '[{"value":"refuse","label":"Politely refuse & offer water","points":2},{"value":"manager","label":"Check with a manager first","points":1},{"value":"serve","label":"Serve it","points":0}]');

-- Server / waitstaff
insert into questions (role_scope, category, prompt, answer_format, options) values
  ('{server}', 'skills', 'Which POS systems have you used?', 'single_select',
    '[{"value":"multiple","label":"Several","points":2},{"value":"one","label":"One","points":1},{"value":"none","label":"None yet","points":0}]'),
  ('{server}', 'skills', 'Rate your comfort recommending and upselling specials.', 'scale',
    '{"min":1,"max":5,"minLabel":"Low","maxLabel":"High"}'),
  ('{server}', 'situational', 'A table says their food is cold. Your first move?', 'single_select',
    '[{"value":"fix","label":"Apologise & get it remade fast","points":2},{"value":"ask","label":"Ask what they''d like to do","points":1},{"value":"defend","label":"Explain it left the kitchen hot","points":0}]');

-- Retail / sales
insert into questions (role_scope, category, prompt, answer_format, options) values
  ('{retail_sales}', 'skills', 'How would you describe your cash-handling / POS experience?', 'single_select',
    '[{"value":"strong","label":"Confident & experienced","points":2},{"value":"some","label":"Some experience","points":1},{"value":"none","label":"None yet","points":0}]'),
  ('{retail_sales}', 'attitude', 'Are you comfortable working toward individual sales targets?', 'yes_no',
    '[{"value":"yes","label":"Yes","points":2},{"value":"no","label":"Prefer not","points":0}]'),
  ('{retail_sales}', 'situational', 'A customer wants a refund without a receipt. What do you do?', 'single_select',
    '[{"value":"policy","label":"Follow store policy, offer options","points":2},{"value":"manager","label":"Escalate to a manager","points":1},{"value":"refuse","label":"Refuse outright","points":0}]');

-- Store manager
insert into questions (role_scope, category, prompt, answer_format, options) values
  ('{store_manager}', 'experience', 'How many years have you led a team?', 'scale',
    '{"min":1,"max":5,"minLabel":"<1 yr","maxLabel":"5+ yrs"}'),
  ('{store_manager}', 'experience', 'Largest team you''ve managed?', 'single_select',
    '[{"value":"1_3","label":"1–3","points":0},{"value":"4_8","label":"4–8","points":1},{"value":"9_15","label":"9–15","points":2},{"value":"15p","label":"15+","points":2}]'),
  ('{store_manager}', 'skills', 'Comfortable owning rosters, stock, and basic P&L?', 'yes_no',
    '[{"value":"yes","label":"Yes","points":2},{"value":"no","label":"No","points":0}]'),
  ('{store_manager}', 'situational', 'Two staff call in sick on a busy Saturday. First action?', 'single_select',
    '[{"value":"cover","label":"Work the floor & call backups","points":2},{"value":"reassign","label":"Reassign remaining staff","points":1},{"value":"wait","label":"Wait and see","points":0}]');

-- ============================================================
-- 0026_organizations.sql
-- ============================================================
-- SHIFTED — organization model (SHIFTED_Platform_Concept_BuildSpec §3, §5).
-- An Employer organization (= employer_profiles) gains LOCATIONS and STAFF SEATS
-- (Owner / Manager) so multiple people can act on one org. The owner is the user
-- whose id == employer_profiles.id; managers hold an active staff_seat.
-- Run after 0001–0025.

create table locations (
  id          uuid primary key default gen_random_uuid(),
  employer_id uuid not null references employer_profiles (id) on delete cascade,
  name        text not null,
  address     text,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index locations_employer_idx on locations (employer_id);

create table staff_seats (
  id            uuid primary key default gen_random_uuid(),
  employer_id   uuid not null references employer_profiles (id) on delete cascade,
  user_id       uuid references profiles (id) on delete cascade,
  invited_email text,
  role          text not null default 'manager' check (role in ('owner', 'manager')),
  permissions   text[] not null default '{}',
  status        text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  created_at    timestamptz not null default now()
);
create index staff_seats_employer_idx on staff_seats (employer_id);
create index staff_seats_user_idx on staff_seats (user_id);

alter table jobs add column if not exists location_id uuid references locations (id) on delete set null;

-- ── Membership predicate ─────────────────────────────────────────────────────
-- A user belongs to an org if they own it (id == employer_id) OR hold a
-- non-revoked seat (matched by user_id, or by the email they were invited with).
create or replace function is_org_member(p_org uuid)
returns boolean language sql security definer stable set search_path = public, auth as $$
  select
    auth.uid() = p_org
    or exists (
      select 1 from staff_seats s
      where s.employer_id = p_org and s.status <> 'revoked'
        and (
          s.user_id = auth.uid()
          or lower(s.invited_email) = lower((select email from auth.users where id = auth.uid()))
        )
    );
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table locations    enable row level security;
alter table staff_seats  enable row level security;

create policy "loc public read"  on locations for select using (true);
create policy "loc member write" on locations for all
  using (is_org_member(employer_id)) with check (is_org_member(employer_id));

-- Seats: the owner manages them; a user can see seats that reference them.
create policy "seat owner all" on staff_seats for all
  using (employer_id = auth.uid()) with check (employer_id = auth.uid());
create policy "seat self read" on staff_seats for select
  using (user_id = auth.uid() or lower(invited_email) = lower((select email from auth.users where id = auth.uid())));

-- Org members (managers) can act on the org's jobs, applicants, and engagements.
create policy "jobs org member read"   on jobs for select using (is_org_member(employer_id));
create policy "jobs org member insert" on jobs for insert with check (is_org_member(employer_id));
create policy "jobs org member update" on jobs for update using (is_org_member(employer_id)) with check (is_org_member(employer_id));

create policy "apps org member read" on applications for select using (
  exists (select 1 from jobs j where j.id = job_id and is_org_member(j.employer_id))
);
create policy "apps org member update" on applications for update using (
  exists (select 1 from jobs j where j.id = job_id and is_org_member(j.employer_id))
);

create policy "answers org member read" on answers for select using (
  exists (select 1 from applications a join jobs j on j.id = a.job_id
          where a.id = application_id and is_org_member(j.employer_id))
);

create policy "eng org member all" on engagements for all
  using (is_org_member(employer_id)) with check (is_org_member(employer_id));

grant select on locations to anon, authenticated, service_role;
grant insert, update, delete on locations to authenticated, service_role;
grant select, insert, update, delete on staff_seats to authenticated, service_role;
grant execute on function is_org_member(uuid) to authenticated, service_role;

-- Backfill a primary location per existing employer from their profile location.
insert into locations (employer_id, name, address, is_primary)
select id, coalesce(company_name, 'Main location'), location, true
from employer_profiles
where not exists (select 1 from locations l where l.employer_id = employer_profiles.id);

-- ============================================================
-- 0027_admin_metrics.sql
-- ============================================================
-- ===========================================================================
-- 0027 — Admin metrics
-- ---------------------------------------------------------------------------
-- A single security-definer function that returns marketplace-health numbers
-- as one jsonb blob. CLAUDE.md asks us to instrument: active jobs, applies,
-- hires, time-to-fill, repeat employers. This is the read side of that.
--
-- Why security-definer + an internal is_admin() gate (not raw table SELECT):
-- admins have no broad cross-employer read policy on jobs/applications/
-- engagements, and we don't want to add one. The function aggregates server
-- side and returns only counts — never raw rows, never worker PII. It fails
-- closed: a non-admin caller gets an exception, not an empty result.
-- ===========================================================================

create or replace function admin_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not is_admin() then
    raise exception 'admin_metrics: not authorized';
  end if;

  select jsonb_build_object(
    'generated_at', now(),

    -- Liquidity: supply (jobs) and demand (applies)
    'jobs_active',      (select count(*) from jobs where status = 'published'),
    'jobs_total',       (select count(*) from jobs),
    'jobs_new_30d',     (select count(*) from jobs where created_at >= now() - interval '30 days'),
    'applies_total',    (select count(*) from applications),
    'applies_30d',      (select count(*) from applications where created_at >= now() - interval '30 days'),

    -- Outcomes
    'hires_total',      (select count(*) from applications where status = 'hired'),
    'hires_30d',        (select count(*) from applications
                          where status = 'hired' and updated_at >= now() - interval '30 days'),

    -- Accounts
    'employers_total',  (select count(*) from employer_profiles),
    'candidates_total', (select count(*) from candidate_profiles),

    -- Repeat employers: posted 2+ jobs ever (came back to use the platform)
    'repeat_employers', (
      select count(*) from (
        select employer_id from jobs group by employer_id having count(*) >= 2
      ) r
    ),

    -- Time-to-fill: per filled job, days from posting to its first hire.
    -- Posting time = published_at, falling back to created_at. The hire moment
    -- is approximated by the hired application's updated_at (last transition).
    -- Reported as median + average over jobs that actually have a hire.
    'time_to_fill_median_days', (
      select round(percentile_cont(0.5) within group (order by ttf)::numeric, 1)
      from (
        select extract(epoch from (
                 min(a.updated_at) - coalesce(j.published_at, j.created_at)
               )) / 86400.0 as ttf
        from applications a
        join jobs j on j.id = a.job_id
        where a.status = 'hired'
        group by a.job_id, j.published_at, j.created_at
      ) t
      where ttf >= 0
    ),
    'time_to_fill_avg_days', (
      select round(avg(ttf)::numeric, 1)
      from (
        select extract(epoch from (
                 min(a.updated_at) - coalesce(j.published_at, j.created_at)
               )) / 86400.0 as ttf
        from applications a
        join jobs j on j.id = a.job_id
        where a.status = 'hired'
        group by a.job_id, j.published_at, j.created_at
      ) t
      where ttf >= 0
    ),
    'jobs_filled', (
      select count(distinct job_id) from applications where status = 'hired'
    ),

    -- Funnel: applications by status (applied → … → hired/rejected).
    -- status is an enum — cast to text so it can be a jsonb object key.
    'application_funnel', coalesce((
      select jsonb_object_agg(status, n)
      from (select status::text as status, count(*) n from applications group by status) s
    ), '{}'::jsonb),

    -- Supply by status (draft / published / closed)
    'jobs_by_status', coalesce((
      select jsonb_object_agg(status, n)
      from (select status::text as status, count(*) n from jobs group by status) s
    ), '{}'::jsonb)
  ) into result;

  return result;
end;
$$;

-- Authenticated only; the function itself enforces is_admin(). Never anon.
revoke all on function admin_metrics() from public;
grant execute on function admin_metrics() to authenticated;

-- ============================================================
-- 0028_payments.sql
-- ============================================================
-- ===========================================================================
-- 0028 — Payments (real charges for boosted listings)
-- ---------------------------------------------------------------------------
-- The Phase-1 revenue wedge (CLAUDE.md): boosting a job is now a real, paid
-- action via Stripe-hosted Checkout. This adds the ledger + the paywall.
--
-- Security model — the boost must only be granted after money actually moves:
--   * payments: employers can read + insert their OWN rows, but have NO update
--     policy. Status only advances to 'paid' from the webhook (service_role,
--     which bypasses RLS) — an employer can never mark their own payment paid.
--   * jobs_guard_boost(): a trigger that lets ONLY service_role change a job's
--     boosted_until. Without it, the jobs UPDATE policy would let an employer
--     set their own boost for free. With it, the Stripe webhook is the single
--     path to a live boost. Employers' normal job edits leave boosted_until
--     untouched, so they pass the guard unaffected.
-- ===========================================================================

create type payment_status as enum ('pending', 'paid', 'failed', 'canceled');
-- Extendable: add 'plan_starter' / 'plan_growth' when subscriptions go paid.
create type payment_kind as enum ('boost');

create table payments (
  id                      uuid primary key default gen_random_uuid(),
  employer_id             uuid not null references employer_profiles (id) on delete cascade,
  kind                    payment_kind not null,
  job_id                  uuid references jobs (id) on delete set null,
  amount_thb              int not null,
  currency                text not null default 'thb',
  status                  payment_status not null default 'pending',
  provider                text not null default 'stripe',
  provider_session_id     text,   -- Stripe Checkout Session id (cs_...)
  provider_payment_intent text,   -- Stripe PaymentIntent id (pi_...)
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  paid_at                 timestamptz
);

create index payments_employer_idx on payments (employer_id, created_at desc);
create unique index payments_session_idx
  on payments (provider_session_id) where provider_session_id is not null;

create trigger payments_set_updated_at
  before update on payments
  for each row execute function set_updated_at();

alter table payments enable row level security;

create policy "pay: employer read own"
  on payments for select using (auth.uid() = employer_id);
create policy "pay: employer insert own"
  on payments for insert to authenticated with check (auth.uid() = employer_id);
create policy "pay: admin all"
  on payments for all using (is_admin()) with check (is_admin());
-- Deliberately NO employer UPDATE policy — fulfilment is service_role only.

grant all on payments to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Paywall guard: only the payment webhook (service_role) may extend a boost.
-- ---------------------------------------------------------------------------
create or replace function jobs_guard_boost()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.boosted_until is distinct from old.boosted_until
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'boosted_until can only be changed by the payment webhook';
  end if;
  return new;
end;
$$;

create trigger jobs_guard_boost_trg
  before update on jobs
  for each row execute function jobs_guard_boost();

-- ============================================================
-- 0029_has_unread.sql
-- ============================================================
-- ===========================================================================
-- 0029 — has_unread_messages()
-- ---------------------------------------------------------------------------
-- The site header previously SELECTed every one of a user's conversation rows
-- on each render just to compute one boolean (is anything unread?). Replace
-- that with a single security-definer EXISTS. It only ever reveals the CALLER's
-- own unread state (filtered by auth.uid()), so it returns a bare boolean and
-- leaks nothing.
-- ===========================================================================

create or replace function has_unread_messages()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from conversations c
    where (c.employer_id = auth.uid()
           and (c.employer_last_read_at is null
                or c.last_message_at > c.employer_last_read_at))
       or (c.worker_id = auth.uid()
           and (c.worker_last_read_at is null
                or c.last_message_at > c.worker_last_read_at))
  );
$$;

revoke all on function has_unread_messages() from public;
grant execute on function has_unread_messages() to authenticated;

-- ============================================================
-- 0030_profiles_guard_admin.sql
-- ============================================================
-- ===========================================================================
-- Close a privilege-escalation hole: "profiles: update own" (0001_init.sql)
-- lets a user UPDATE their own profiles row with no column restriction and no
-- WITH CHECK — including is_admin. Since is_admin() gates nearly every admin
-- policy in the app (payments, verification queues, Trust Circle reads,
-- moderation, billing_events, marketing leads, admin_metrics(), ...), any
-- authenticated user could self-promote to admin and inherit all of it.
--
-- profiles_guard_admin(): mirrors jobs_guard_boost() (0028_payments.sql) —
-- a trigger that lets ONLY service_role change is_admin. Employers'/
-- candidates' normal profile edits (name, avatar, role, etc.) leave
-- is_admin untouched, so they pass the guard unaffected.
-- ===========================================================================

create or replace function profiles_guard_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_admin is distinct from old.is_admin
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'is_admin can only be changed by the service role';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_admin_trg
  before update on profiles
  for each row execute function profiles_guard_admin();

-- ============================================================
-- 0031_subscription_billing.sql
-- ============================================================
-- ===========================================================================
-- 0031 — Real Stripe subscription billing for employer plan tiers
-- ---------------------------------------------------------------------------
-- Extends the Phase-1 payments model (0028_payments.sql) to cover recurring
-- subscriptions (Starter ฿990/mo, Growth ฿2,490/mo), not just one-time
-- boosts. Until now, `upgradeTo()` was a stub that flipped `plan` directly
-- with no charge — this closes that hole with the same security model
-- already proven for boosts:
--   * A paid plan can only be granted by the Stripe webhook (service_role),
--     never by the employer's own session — see employer_profiles_guard_plan().
--   * Downgrading yourself to 'free' stays self-service (no incentive to
--     abuse giving up your own paid features).
--
-- payment_kind gains 'plan_starter' / 'plan_growth' — the extension already
-- anticipated in 0028's comment. stripe_customer_id lets us reuse one Stripe
-- Customer across checkout attempts instead of creating duplicates, and lets
-- the webhook resolve `customer.subscription.*` events back to an employer.
-- ===========================================================================

alter type payment_kind add value if not exists 'plan_starter';
alter type payment_kind add value if not exists 'plan_growth';

alter table employer_profiles add column stripe_customer_id text;
alter table employer_profiles add column stripe_subscription_id text;
-- Stripe's own subscription status vocabulary (active, trialing, past_due,
-- canceled, unpaid, incomplete, incomplete_expired, paused) — stored as-is
-- rather than a Postgres enum so a new Stripe status doesn't need a migration.
alter table employer_profiles add column subscription_status text;

create unique index employer_profiles_stripe_customer_idx
  on employer_profiles (stripe_customer_id) where stripe_customer_id is not null;
create unique index employer_profiles_stripe_subscription_idx
  on employer_profiles (stripe_subscription_id) where stripe_subscription_id is not null;

-- ---------------------------------------------------------------------------
-- Paywall guard: only the Stripe webhook (service_role) may set `plan` to a
-- paid tier. Mirrors jobs_guard_boost() (0028) / profiles_guard_admin() (0030)
-- exactly — same pattern, same reasoning, third guard trigger in this app.
-- ---------------------------------------------------------------------------
create or replace function employer_profiles_guard_plan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.plan is distinct from old.plan
     and new.plan in ('pro', 'growth')
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'plan can only be upgraded via a completed Stripe checkout';
  end if;
  return new;
end;
$$;

create trigger employer_profiles_guard_plan_trg
  before update on employer_profiles
  for each row execute function employer_profiles_guard_plan();

-- ============================================================
-- 0032_guard_plan_insert.sql
-- ============================================================
-- ===========================================================================
-- 0032 — Close an INSERT-time bypass on employer_profiles_guard_plan
-- ---------------------------------------------------------------------------
-- employer_profiles_guard_plan_trg (0031) only fired BEFORE UPDATE. A
-- first-time employer_profiles row insert — the "employers: insert own" RLS
-- policy (0001_init.sql) has no column restriction beyond `auth.uid() = id`
-- — could set `plan` directly to 'pro'/'growth' at row creation, bypassing
-- the guard entirely: a fresh insert never takes the UPDATE path the guard
-- covers, even via `.upsert()` (Postgres only fires BEFORE UPDATE when a
-- conflicting row already exists). Found by a post-ship audit before this
-- had a chance to be exploited or to matter financially (test-mode key).
--
-- Fix: fire the same trigger on INSERT too. No change to the function body
-- needed — `old` is NULL on insert, and `new.plan is distinct from old.plan`
-- is already TRUE whenever new.plan is non-null and old is null (IS
-- DISTINCT FROM treats NULL as a distinct value), so the existing
-- `and new.plan in ('pro','growth')` check gates exactly the same thing on
-- both insert and update. Normal signups are unaffected: onboarding never
-- sets `plan` explicitly, so it lands on its 'free' column default, which
-- isn't in ('pro','growth') and isn't blocked.
-- ===========================================================================

drop trigger if exists employer_profiles_guard_plan_trg on employer_profiles;

create trigger employer_profiles_guard_plan_trg
  before insert or update on employer_profiles
  for each row execute function employer_profiles_guard_plan();
-- ============================================================
-- 0033_content_cms.sql
-- ============================================================
-- ===========================================================================
-- 0033 — Rights articles & marketing content move from git Markdown to DB
-- ---------------------------------------------------------------------------
-- Replaces content/rights/**/*.md and content/marketing/**/*.md (previously
-- read via lib/rights.ts / lib/marketing-content.ts + a build-time generator,
-- scripts/generate-content.mjs, added for Cloudflare Workers compatibility)
-- with real tables, editable from a new /admin/content UI instead of
-- hand-editing Markdown and pushing git commits. No new CMS vendor, no new
-- database — just extends the existing Supabase Postgres DB every other
-- part of the app already uses.
--
-- Public read (this content is public-facing marketing/legal-info), admin-
-- only write — same shape as the questions bank (0025): "public read
-- (using true, or a status filter)" + "admin write (is_admin())".
-- ===========================================================================

create table rights_articles (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null,
  lang              text not null check (lang in ('en', 'th')),
  title             text not null,
  summary           text not null default '',
  category          text not null,
  audience          text not null default 'both' check (audience in ('both', 'employee', 'employer')),
  last_reviewed     date,
  review_cadence    text not null default 'quarterly' check (review_cadence in ('monthly', 'quarterly', 'on-law-change')),
  status            text not null default 'draft' check (status in ('draft', 'legal-review', 'published')),
  related           text[] not null default '{}',
  keywords          text[] not null default '{}',
  sources           jsonb not null default '[]', -- [{ "title", "url" }]
  disclaimer        boolean not null default false,
  section_quick     text not null default '',
  section_law       text not null default '',
  section_employees text not null default '',
  section_employers text not null default '',
  section_myths     text not null default '',
  section_good      text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (slug, lang)
);
create index rights_articles_slug_idx on rights_articles (slug);
create trigger rights_articles_set_updated_at before update on rights_articles
  for each row execute function set_updated_at();

create table marketing_ideas (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  title                 text not null,
  excerpt               text not null default '',
  category              text not null default 'Operations & Growth',
  cover_image           text,
  author_name           text not null default 'SHIFTED',
  author_role           text not null default 'Operators',
  read_time             int,
  published             boolean not null default false,
  published_at          date,
  featured              boolean not null default false,
  cta_type              text not null default 'solutions' check (cta_type in ('booyah', 'shifted-hire', 'solutions')),
  body_markdown         text not null default '',
  seo_meta_title        text,
  seo_meta_description  text,
  seo_og_image          text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create trigger marketing_ideas_set_updated_at before update on marketing_ideas
  for each row execute function set_updated_at();

create table marketing_spotlights (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  business_name         text not null,
  logo                  text,
  hero_image            text,
  category              text not null default 'other',
  area                  text not null default '',
  founded_year          int,
  socials               jsonb not null default '[]', -- [{ "label", "url" }]
  website               text,
  shifted_employer_id   uuid references employer_profiles (id) on delete set null,
  published             boolean not null default false,
  published_at          date,
  featured              boolean not null default false,
  section_story         text not null default '',
  section_culture       text not null default '',
  section_known_for     text not null default '',
  seo_meta_title        text,
  seo_meta_description  text,
  seo_og_image          text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create trigger marketing_spotlights_set_updated_at before update on marketing_spotlights
  for each row execute function set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table rights_articles      enable row level security;
alter table marketing_ideas      enable row level security;
alter table marketing_spotlights enable row level security;

-- Public site pages only ever want status = 'published' (matches
-- getAllRightsArticles()/getRightsArticle() already filtering out drafts
-- today) — draft / legal-review rows stay admin-only so unreviewed
-- compliance claims never leak publicly. Admin UI (is_admin()) needs every
-- status to actually edit drafts.
create policy "rights public read" on rights_articles for select
  using (status = 'published' or is_admin());
create policy "rights admin write" on rights_articles for all
  using (is_admin()) with check (is_admin());

create policy "ideas public read" on marketing_ideas for select
  using (published or is_admin());
create policy "ideas admin write" on marketing_ideas for all
  using (is_admin()) with check (is_admin());

create policy "spotlights public read" on marketing_spotlights for select
  using (published or is_admin());
create policy "spotlights admin write" on marketing_spotlights for all
  using (is_admin()) with check (is_admin());

grant select on rights_articles, marketing_ideas, marketing_spotlights
  to anon, authenticated, service_role;
grant insert, update, delete on rights_articles, marketing_ideas, marketing_spotlights
  to authenticated, service_role;

-- ============================================================
-- 0034_rights_public_read_legal_review.sql
-- ============================================================
-- ===========================================================================
-- 0034 — Fix rights_articles public-read policy to match app-level visibility
-- ---------------------------------------------------------------------------
-- 0033's "rights public read" policy gated on status = 'published'. But the
-- app's own definition of "publicly visible" (lib/rights.ts, unchanged
-- across the Markdown → DB migration) has always been status <> 'draft' —
-- 'legal-review' articles are shown too, just without the "published"
-- guardrail (sources/last_reviewed/disclaimer required, enforced in
-- lib/rights.ts's toArticle()). RLS was stricter than the app: it silently
-- zeroed out every migrated article before the app-level filter ever ran,
-- since all 6 rights articles are currently 'legal-review', not
-- 'published'. Caught immediately via local preview (empty rights hub)
-- before this shipped to production.
--
-- marketing_ideas/marketing_spotlights are unaffected — those use a plain
-- `published` boolean (not a status enum), and the migration script set it
-- true for every existing file, matching their actual live-today status.
-- ===========================================================================

drop policy if exists "rights public read" on rights_articles;
create policy "rights public read" on rights_articles for select
  using (status <> 'draft' or is_admin());
