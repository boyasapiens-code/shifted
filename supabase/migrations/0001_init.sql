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
