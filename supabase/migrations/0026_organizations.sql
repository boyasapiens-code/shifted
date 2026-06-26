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
