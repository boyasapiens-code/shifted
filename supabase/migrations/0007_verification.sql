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
