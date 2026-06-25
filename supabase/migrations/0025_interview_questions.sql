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
