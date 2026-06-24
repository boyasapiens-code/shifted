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
