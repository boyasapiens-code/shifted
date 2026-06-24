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
