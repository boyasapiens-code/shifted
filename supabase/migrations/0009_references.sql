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
