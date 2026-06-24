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
