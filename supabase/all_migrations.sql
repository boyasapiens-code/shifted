-- SHIFTED — full schema (migrations 0001–0011, in order)

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


