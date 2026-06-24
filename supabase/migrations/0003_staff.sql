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
