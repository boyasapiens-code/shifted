-- SHIFTED — prompt-driven one-tap verification + employer accountability score.
-- Completing an engagement generates verification prompts for milestone skills;
-- the employer confirms/declines in one tap. Auto-verifiable skills are
-- confirmed by the system. An employer's response rate becomes a public
-- accountability signal. Run after 0001–0012.
--
-- Stubs (need external infra): push notifications → in-app inbox; POS/clock-out
-- → engagement completion; geo/device capture → nullable columns.

-- How a skill's badge gets verified.
alter table skills add column verify_method text not null default 'none';
-- 'none' = no badge/prompt · 'manual' = needs a human tap · 'auto' = system-proven

create type prompt_status as enum ('pending', 'confirmed', 'declined', 'disputed');
create type verify_source as enum ('manual', 'auto_pos', 'auto_attendance');

create table verification_prompts (
  id            uuid primary key default gen_random_uuid(),
  worker_id     uuid not null references candidate_profiles (id) on delete cascade,
  employer_id   uuid not null references employer_profiles (id) on delete cascade,
  manager_id    uuid,                       -- who responded
  skill_id      uuid not null references skills (id) on delete cascade,
  engagement_id uuid references engagements (id) on delete set null,
  badge_type    text,
  status        prompt_status not null default 'pending',
  method        verify_source not null default 'manual',
  note          text,
  geo           text,                        -- venue geo at response (future)
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  unique (engagement_id, skill_id)
);

create index vp_employer_status_idx on verification_prompts (employer_id, status);
create index vp_worker_idx          on verification_prompts (worker_id);

-- Employer accountability (feedback responsiveness).
alter table employer_profiles add column response_rate numeric;          -- 0..1, null until eligible
alter table employer_profiles add column prompts_eligible int not null default 0;
alter table employer_profiles add column prompts_responded int not null default 0;
alter table employer_profiles add column responsiveness_since timestamptz default now(); -- onboarding grace anchor

-- Rolling-30-day response rate. Auto prompts don't count (don't punish managers
-- for data the system already has). Responded = confirmed/declined within 48h.
create or replace function refresh_employer_responsiveness(uid uuid)
returns void language plpgsql as $$
begin
  update employer_profiles e set
    prompts_eligible  = a.elig,
    prompts_responded = a.resp,
    response_rate     = case when a.elig = 0 then null
                             else round(a.resp::numeric / a.elig, 2) end
  from (
    select
      count(*) filter (
        where method = 'manual' and created_at > now() - interval '30 days'
      ) as elig,
      count(*) filter (
        where method = 'manual' and created_at > now() - interval '30 days'
          and status in ('confirmed', 'declined')
          and responded_at is not null
          and responded_at <= created_at + interval '48 hours'
      ) as resp
    from verification_prompts where employer_id = uid
  ) a
  where e.id = uid;
end;
$$;

create or replace function trg_prompt_responsiveness()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform refresh_employer_responsiveness(old.employer_id);
    return old;
  end if;
  perform refresh_employer_responsiveness(new.employer_id);
  return new;
end;
$$;

create trigger prompt_responsiveness
  after insert or update or delete on verification_prompts
  for each row execute function trg_prompt_responsiveness();

-- ===========================================================================
-- Row-Level Security
-- ===========================================================================
alter table verification_prompts enable row level security;

create policy "vp: employer manage own"
  on verification_prompts for all
  using (auth.uid() = employer_id)
  with check (auth.uid() = employer_id);

create policy "vp: worker read own"
  on verification_prompts for select using (auth.uid() = worker_id);

-- Worker may dispute a confirmed badge (only flip confirmed → disputed).
create policy "vp: worker dispute"
  on verification_prompts for update
  using (auth.uid() = worker_id and status = 'confirmed')
  with check (auth.uid() = worker_id and status = 'disputed');

create policy "vp: admin all"
  on verification_prompts for all using (is_admin()) with check (is_admin());

grant all on verification_prompts to anon, authenticated, service_role;
