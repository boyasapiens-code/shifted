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
