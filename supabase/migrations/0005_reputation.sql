-- SHIFTED — reputation core: engagements + two-way reviews + reliability.
-- The moat: verified work history and ratings gated to real completed work.
-- Run after 0001–0004.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type engagement_status as enum ('active', 'completed', 'cancelled');
create type attendance_status as enum ('pending', 'on_time', 'late', 'no_show');
create type review_kind as enum ('of_worker', 'of_employer');

-- ---------------------------------------------------------------------------
-- engagements — a worker did a job for an employer
-- ---------------------------------------------------------------------------
create table engagements (
  id           uuid primary key default gen_random_uuid(),
  employer_id  uuid not null references employer_profiles (id) on delete cascade,
  worker_id    uuid not null references candidate_profiles (id) on delete cascade,
  job_id       uuid references jobs (id) on delete set null,
  role_title   text,
  status       engagement_status not null default 'active',
  attendance   attendance_status not null default 'pending',
  started_on   date,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (employer_id, worker_id, job_id)
);

create trigger engagements_set_updated_at
  before update on engagements
  for each row execute function set_updated_at();

create index engagements_employer_idx on engagements (employer_id);
create index engagements_worker_idx   on engagements (worker_id);
create index engagements_status_idx   on engagements (status);

-- ---------------------------------------------------------------------------
-- reviews — one per party per engagement, two-way
-- ---------------------------------------------------------------------------
create table reviews (
  id            uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements (id) on delete cascade,
  author_id     uuid not null,            -- auth.uid() of the reviewer
  subject_id    uuid not null,            -- auth.uid() of the reviewed party
  kind          review_kind not null,     -- whether the subject is the worker or employer
  rating        int not null check (rating between 1 and 5),
  comment       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (engagement_id, author_id)
);

create trigger reviews_set_updated_at
  before update on reviews
  for each row execute function set_updated_at();

create index reviews_subject_idx    on reviews (subject_id);
create index reviews_engagement_idx on reviews (engagement_id);

-- ---------------------------------------------------------------------------
-- Aggregate columns on the profiles
-- ---------------------------------------------------------------------------
alter table candidate_profiles add column rating_avg numeric(3, 2);
alter table candidate_profiles add column rating_count int not null default 0;
-- candidate_profiles.reliability_score (int, 0-100) already exists from 0001.

alter table employer_profiles add column rating_avg numeric(3, 2);
alter table employer_profiles add column rating_count int not null default 0;

-- ---------------------------------------------------------------------------
-- Aggregate maintenance
-- ---------------------------------------------------------------------------
create or replace function refresh_review_aggregates(uid uuid)
returns void language plpgsql as $$
begin
  update candidate_profiles c set
    rating_avg = a.avg, rating_count = a.cnt
  from (
    select round(avg(rating)::numeric, 2) as avg, count(*) as cnt
    from reviews where subject_id = uid and kind = 'of_worker'
  ) a where c.id = uid;

  update employer_profiles e set
    rating_avg = a.avg, rating_count = a.cnt
  from (
    select round(avg(rating)::numeric, 2) as avg, count(*) as cnt
    from reviews where subject_id = uid and kind = 'of_employer'
  ) a where e.id = uid;
end;
$$;

-- Worker reliability: % of completed engagements where the worker showed up.
create or replace function refresh_reliability(uid uuid)
returns void language plpgsql as $$
begin
  update candidate_profiles c set reliability_score = a.score
  from (
    select case
      when count(*) filter (where status = 'completed') = 0 then null
      else round(
        100.0 * count(*) filter (where status = 'completed' and attendance in ('on_time', 'late'))
        / count(*) filter (where status = 'completed')
      )::int
    end as score
    from engagements where worker_id = uid
  ) a where c.id = uid;
end;
$$;

create or replace function trg_reviews_aggregates()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform refresh_review_aggregates(old.subject_id);
    return old;
  end if;
  perform refresh_review_aggregates(new.subject_id);
  if tg_op = 'UPDATE' and new.subject_id <> old.subject_id then
    perform refresh_review_aggregates(old.subject_id);
  end if;
  return new;
end;
$$;

create trigger reviews_aggregates
  after insert or update or delete on reviews
  for each row execute function trg_reviews_aggregates();

create or replace function trg_engagements_reliability()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform refresh_reliability(old.worker_id);
    return old;
  end if;
  perform refresh_reliability(new.worker_id);
  if tg_op = 'UPDATE' and new.worker_id <> old.worker_id then
    perform refresh_reliability(old.worker_id);
  end if;
  return new;
end;
$$;

create trigger engagements_reliability
  after insert or update or delete on engagements
  for each row execute function trg_engagements_reliability();

-- ===========================================================================
-- Row-Level Security
-- ===========================================================================
alter table engagements enable row level security;
alter table reviews     enable row level security;

-- engagements: employer manages their own; worker can read their own.
create policy "engagements: employer manage own"
  on engagements for all
  using (auth.uid() = employer_id)
  with check (auth.uid() = employer_id);
create policy "engagements: worker read own"
  on engagements for select
  using (auth.uid() = worker_id);

-- reviews: publicly readable (shown on profiles).
create policy "reviews: public read"
  on reviews for select using (true);

-- reviews: a party may insert exactly one review of the OTHER party, only on a
-- completed engagement they belong to.
create policy "reviews: party insert on completed engagement"
  on reviews for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from engagements e
      where e.id = engagement_id
        and e.status = 'completed'
        and (
          (auth.uid() = e.employer_id and subject_id = e.worker_id   and kind = 'of_worker')
          or
          (auth.uid() = e.worker_id   and subject_id = e.employer_id and kind = 'of_employer')
        )
    )
  );

create policy "reviews: author update own"
  on reviews for update using (auth.uid() = author_id);

-- ---------------------------------------------------------------------------
-- Grants (explicit, in case default privileges don't cover new tables)
-- ---------------------------------------------------------------------------
grant all on engagements to anon, authenticated, service_role;
grant all on reviews      to anon, authenticated, service_role;
