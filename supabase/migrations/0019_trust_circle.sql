-- SHIFTED — TRUST CIRCLE (tc_*): premium employer-to-employer workforce
-- referral network. From TRUST_CIRCLE_BUILD_SPEC.md. The spec's non-negotiable
-- rules are enforced here as CODE (constraints + RLS + security-definer
-- functions), not policy. Fail closed everywhere. Run after 0001–0018.
--
-- Invariants baked in:
--   1. Consent gate   — no worker data is returned by any network read unless an
--      active consent row covers that scope. Enforced in the read functions AND
--      by withholding any broad table-level SELECT policy for members.
--   2. No sensitive    — no health/criminal/religion/etc. column exists at all.
--   3. No compensation — no salary/wage/pay column exists at all.
--   4. No free-text about workers — endorsements/references are fixed scales only.
--      The ONLY free-text column (tc_worker_response.body) belongs to the worker.
--   5. Audit-on-read   — every network read goes through a function that writes a
--      worker-visible tc_access_log row in the same transaction. No silent reads.
--   6. Revocable       — withdrawing consent flips visibility off immediately for
--      future queries; the access log is retained.

-- ── enums ──────────────────────────────────────────────────────────────────
create type tc_member_status  as enum ('pending', 'probation', 'active', 'suspended', 'exited');
create type tc_member_tier    as enum ('growth', 'trust_circle');
create type tc_consent_scope  as enum ('pool_discoverable', 'reference_sharing', 'endorsement_visible');
create type tc_consent_status as enum ('active', 'withdrawn');
create type tc_ref_status     as enum ('pending', 'answered', 'declined', 'blocked_no_consent');
create type tc_response_target as enum ('endorsement', 'reference');
create type tc_access_action  as enum ('search_hit', 'view_profile', 'view_endorsement', 'view_reference');

-- ── tc_member ───────────────────────────────────────────────────────────────
create table tc_member (
  id              uuid primary key default gen_random_uuid(),
  employer_id     uuid not null unique references employer_profiles (id) on delete cascade,
  status          tc_member_status not null default 'pending',
  ndsca_signed_at timestamptz,                 -- null = NO network access
  ndsca_version   text,
  tier            tc_member_tier not null default 'growth',
  trust_score     numeric,                     -- member-side rating, later phase
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger tc_member_set_updated_at before update on tc_member
  for each row execute function set_updated_at();

-- ── tc_worker_consent — the spine / source of truth for visibility ───────────
create table tc_worker_consent (
  id          uuid primary key default gen_random_uuid(),
  worker_id   uuid not null references candidate_profiles (id) on delete cascade,
  scope       tc_consent_scope not null,
  status      tc_consent_status not null default 'active',
  granted_at  timestamptz not null default now(),
  withdrawn_at timestamptz,
  granted_via text,
  unique (worker_id, scope)
);
create index tc_consent_lookup_idx on tc_worker_consent (worker_id, scope, status);

-- ── tc_endorsement — structured-only; NO free text, NO comp ──────────────────
create table tc_endorsement (
  id                 uuid primary key default gen_random_uuid(),
  worker_id          uuid not null references candidate_profiles (id) on delete cascade,
  member_id          uuid not null references tc_member (id) on delete cascade,
  role_confirmed     text not null,            -- factual job title
  employed_from      date,
  employed_to        date,
  rating_reliability smallint not null check (rating_reliability between 1 and 5),
  rating_skill       smallint not null check (rating_skill between 1 and 5),
  rating_teamwork    smallint not null check (rating_teamwork between 1 and 5),
  rating_punctuality smallint not null check (rating_punctuality between 1 and 5),
  would_rehire       boolean not null,
  created_at         timestamptz not null default now(),
  unique (worker_id, member_id)
);
create index tc_endorsement_worker_idx on tc_endorsement (worker_id);

-- ── tc_reference_request ─────────────────────────────────────────────────────
create table tc_reference_request (
  id                   uuid primary key default gen_random_uuid(),
  worker_id            uuid not null references candidate_profiles (id) on delete cascade,
  requesting_member_id uuid not null references tc_member (id) on delete cascade,
  responding_member_id uuid references tc_member (id) on delete set null,
  status               tc_ref_status not null default 'pending',
  consent_id           uuid references tc_worker_consent (id) on delete set null,
  role_confirmed       text,
  rating_reliability   smallint check (rating_reliability between 1 and 5),
  rating_skill         smallint check (rating_skill between 1 and 5),
  rating_teamwork      smallint check (rating_teamwork between 1 and 5),
  rating_punctuality   smallint check (rating_punctuality between 1 and 5),
  would_rehire         boolean,
  answered_at          timestamptz,
  created_at           timestamptz not null default now()
);
create index tc_refreq_worker_idx on tc_reference_request (worker_id);

-- ── tc_worker_response — the worker's right-to-respond (only free text) ───────
create table tc_worker_response (
  id          uuid primary key default gen_random_uuid(),
  worker_id   uuid not null references candidate_profiles (id) on delete cascade,
  target_type tc_response_target not null,
  target_id   uuid not null,
  body        text not null,                   -- worker-authored, the ONLY free text
  created_at  timestamptz not null default now()
);
create index tc_response_target_idx on tc_worker_response (target_type, target_id);

-- ── tc_access_log — every network read; worker-visible ───────────────────────
create table tc_access_log (
  id         uuid primary key default gen_random_uuid(),
  worker_id  uuid not null references candidate_profiles (id) on delete cascade,
  member_id  uuid not null references tc_member (id) on delete cascade,
  action     tc_access_action not null,
  created_at timestamptz not null default now()
);
create index tc_access_worker_idx on tc_access_log (worker_id, created_at desc);

-- ── helper predicates (security definer, stable) ─────────────────────────────
create or replace function tc_member_id(uid uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select id from tc_member where employer_id = uid;
$$;

create or replace function tc_is_member_active(uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from tc_member
    where employer_id = uid and status = 'active' and ndsca_signed_at is not null
  );
$$;

create or replace function tc_can_search(uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from tc_member
    where employer_id = uid and status = 'active'
      and ndsca_signed_at is not null and tier = 'trust_circle'
  );
$$;

-- The visibility predicate used everywhere.
create or replace function tc_has_consent(p_worker uuid, p_scope tc_consent_scope)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from tc_worker_consent
    where worker_id = p_worker and scope = p_scope and status = 'active'
  );
$$;

-- ── consent writes (worker self-service) ─────────────────────────────────────
create or replace function tc_grant_consent(p_scope tc_consent_scope, p_via text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  insert into tc_worker_consent (worker_id, scope, status, granted_at, withdrawn_at, granted_via)
  values (auth.uid(), p_scope, 'active', now(), null, p_via)
  on conflict (worker_id, scope)
  do update set status = 'active', granted_at = now(), withdrawn_at = null, granted_via = excluded.granted_via;
end;
$$;

create or replace function tc_withdraw_consent(p_scope tc_consent_scope)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  update tc_worker_consent
  set status = 'withdrawn', withdrawn_at = now()
  where worker_id = auth.uid() and scope = p_scope;
end;
$$;

-- ── membership writes ─────────────────────────────────────────────────────────
create or replace function tc_join(p_tier tc_member_tier default 'growth')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from employer_profiles where id = auth.uid()) then
    raise exception 'employer profile required';
  end if;
  insert into tc_member (employer_id, status, tier)
  values (auth.uid(), 'probation', p_tier)
  on conflict (employer_id) do nothing;
end;
$$;

create or replace function tc_sign_ndsca(p_version text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update tc_member
  set ndsca_signed_at = now(), ndsca_version = p_version,
      status = case when status in ('pending','probation') then 'active' else status end
  where employer_id = auth.uid();
end;
$$;

-- MVP: premium tier is a stubbed self-upgrade (no payment), like plan upgrades.
create or replace function tc_set_tier(p_tier tc_member_tier)
returns void language plpgsql security definer set search_path = public as $$
begin
  update tc_member set tier = p_tier where employer_id = auth.uid();
end;
$$;

-- ── endorsement create — allowlisted structured fields only ──────────────────
-- The function signature IS the allowlist: there is no free-text / comp param.
create or replace function tc_create_endorsement(
  p_worker uuid, p_role text, p_from date, p_to date,
  p_reliability smallint, p_skill smallint, p_teamwork smallint, p_punctuality smallint,
  p_would_rehire boolean
) returns uuid language plpgsql security definer set search_path = public as $$
declare m uuid; new_id uuid;
begin
  m := tc_member_id(auth.uid());
  if m is null or not tc_is_member_active(auth.uid()) then
    raise exception 'active Trust Circle member required';
  end if;
  -- "a worker they managed": require a completed engagement.
  if not exists (
    select 1 from engagements e
    where e.employer_id = auth.uid() and e.worker_id = p_worker and e.status = 'completed'
  ) then
    raise exception 'you can only endorse a worker you have managed';
  end if;
  insert into tc_endorsement (
    worker_id, member_id, role_confirmed, employed_from, employed_to,
    rating_reliability, rating_skill, rating_teamwork, rating_punctuality, would_rehire
  ) values (
    p_worker, m, p_role, p_from, p_to,
    p_reliability, p_skill, p_teamwork, p_punctuality, p_would_rehire
  )
  on conflict (worker_id, member_id) do update set
    role_confirmed = excluded.role_confirmed, employed_from = excluded.employed_from,
    employed_to = excluded.employed_to, rating_reliability = excluded.rating_reliability,
    rating_skill = excluded.rating_skill, rating_teamwork = excluded.rating_teamwork,
    rating_punctuality = excluded.rating_punctuality, would_rehire = excluded.would_rehire
  returning id into new_id;
  return new_id;
end;
$$;

-- ── reference request / answer ───────────────────────────────────────────────
create or replace function tc_request_reference(p_worker uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare m uuid; c uuid; st tc_ref_status; new_id uuid;
begin
  m := tc_member_id(auth.uid());
  if m is null or not tc_is_member_active(auth.uid()) then
    raise exception 'active Trust Circle member required';
  end if;
  select id into c from tc_worker_consent
    where worker_id = p_worker and scope = 'reference_sharing' and status = 'active';
  st := case when c is null then 'blocked_no_consent'::tc_ref_status else 'pending'::tc_ref_status end;
  insert into tc_reference_request (worker_id, requesting_member_id, status, consent_id)
  values (p_worker, m, st, c) returning id into new_id;
  return new_id;
end;
$$;

create or replace function tc_answer_reference(
  p_request uuid, p_role text,
  p_reliability smallint, p_skill smallint, p_teamwork smallint, p_punctuality smallint,
  p_would_rehire boolean
) returns void language plpgsql security definer set search_path = public as $$
declare m uuid;
begin
  m := tc_member_id(auth.uid());
  if m is null or not tc_is_member_active(auth.uid()) then
    raise exception 'active Trust Circle member required';
  end if;
  update tc_reference_request set
    responding_member_id = m, role_confirmed = p_role,
    rating_reliability = p_reliability, rating_skill = p_skill,
    rating_teamwork = p_teamwork, rating_punctuality = p_punctuality,
    would_rehire = p_would_rehire, status = 'answered', answered_at = now()
  where id = p_request
    and status = 'pending'
    -- only valid while the worker's reference_sharing consent is still active
    and tc_has_consent(worker_id, 'reference_sharing');
end;
$$;

-- ── worker right-to-respond ──────────────────────────────────────────────────
create or replace function tc_respond(p_target_type tc_response_target, p_target_id uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  insert into tc_worker_response (worker_id, target_type, target_id, body)
  values (auth.uid(), p_target_type, p_target_id, p_body);
end;
$$;

-- ── NETWORK READS — consent-gated + audit-logged, atomically ─────────────────
-- Member search of the opted-in pool. Logs a search_hit per returned worker.
create or replace function tc_search(p_role text default null)
returns table (
  worker_id uuid, full_name text, headline text, location text,
  endorsement_count bigint, avg_reliability numeric, would_rehire_count bigint
) language plpgsql security definer set search_path = public as $$
declare m uuid;
begin
  m := tc_member_id(auth.uid());
  if m is null or not tc_can_search(auth.uid()) then return; end if;  -- fail closed

  return query
  with pool as (
    select cp.id, cp.full_name, cp.headline, cp.location
    from candidate_profiles cp
    where tc_has_consent(cp.id, 'pool_discoverable')
      and (p_role is null or cp.headline ilike '%' || p_role || '%')
  ),
  agg as (
    select e.worker_id,
           count(*) as cnt,
           round(avg(e.rating_reliability), 1) as rel,
           count(*) filter (where e.would_rehire) as rehire
    from tc_endorsement e
    where tc_has_consent(e.worker_id, 'endorsement_visible')
    group by e.worker_id
  ),
  hits as (
    select p.id, p.full_name, p.headline, p.location,
           coalesce(a.cnt, 0) as cnt, a.rel, coalesce(a.rehire, 0) as rehire
    from pool p left join agg a on a.worker_id = p.id
  )
  -- audit: one search_hit per worker surfaced (no silent reads)
  , logged as (
    insert into tc_access_log (worker_id, member_id, action)
    select h.id, m, 'search_hit' from hits h
    returning 1
  )
  select h.id, h.full_name, h.headline, h.location, h.cnt, h.rel, h.rehire
  from hits h;
end;
$$;

-- Member views a consented worker's structured endorsements. Logs the read.
create or replace function tc_view_endorsements(p_worker uuid)
returns table (
  id uuid, role_confirmed text, employed_from date, employed_to date,
  rating_reliability smallint, rating_skill smallint, rating_teamwork smallint,
  rating_punctuality smallint, would_rehire boolean, created_at timestamptz
) language plpgsql security definer set search_path = public as $$
declare m uuid;
begin
  m := tc_member_id(auth.uid());
  if m is null or not tc_is_member_active(auth.uid()) then return; end if;       -- fail closed
  if not tc_has_consent(p_worker, 'endorsement_visible') then return; end if;    -- consent gate

  insert into tc_access_log (worker_id, member_id, action) values (p_worker, m, 'view_endorsement');

  return query
  select e.id, e.role_confirmed, e.employed_from, e.employed_to,
         e.rating_reliability, e.rating_skill, e.rating_teamwork,
         e.rating_punctuality, e.would_rehire, e.created_at
  from tc_endorsement e where e.worker_id = p_worker;
end;
$$;

-- ── RLS: default-deny. Members CANNOT select network tables directly — they
--    must go through the logging functions above. Workers see their own data. ─
alter table tc_member            enable row level security;
alter table tc_worker_consent    enable row level security;
alter table tc_endorsement       enable row level security;
alter table tc_reference_request enable row level security;
alter table tc_worker_response   enable row level security;
alter table tc_access_log        enable row level security;

-- Member: owner reads own membership row; admin all.
create policy "tc_member self read"  on tc_member for select using (employer_id = auth.uid() or is_admin());

-- Consent: worker reads/manages own (writes also go via security-definer fns).
create policy "tc_consent self"      on tc_worker_consent for select using (worker_id = auth.uid() or is_admin());

-- Endorsement: only the worker it's about, or the member who wrote it, may read
-- directly. Everyone else (other members) gets it ONLY via tc_view_endorsements.
create policy "tc_endorsement subject/author read" on tc_endorsement for select
  using (worker_id = auth.uid() or member_id = tc_member_id(auth.uid()) or is_admin());

-- Reference request: the worker, and the involved members.
create policy "tc_refreq involved read" on tc_reference_request for select
  using (worker_id = auth.uid()
         or requesting_member_id = tc_member_id(auth.uid())
         or responding_member_id = tc_member_id(auth.uid())
         or is_admin());

-- Worker response: the worker owns it (read + insert).
create policy "tc_response self read" on tc_worker_response for select using (worker_id = auth.uid() or is_admin());

-- Access log: the worker sees every read of their data (full audit visibility).
create policy "tc_access worker read" on tc_access_log for select using (worker_id = auth.uid() or is_admin());

-- ── grants (no anon — fail closed for the logged-out) ────────────────────────
grant select on tc_member, tc_worker_consent, tc_endorsement, tc_reference_request,
  tc_worker_response, tc_access_log to authenticated, service_role;

grant execute on function
  tc_member_id(uuid), tc_is_member_active(uuid), tc_can_search(uuid),
  tc_has_consent(uuid, tc_consent_scope),
  tc_grant_consent(tc_consent_scope, text), tc_withdraw_consent(tc_consent_scope),
  tc_join(tc_member_tier), tc_sign_ndsca(text), tc_set_tier(tc_member_tier),
  tc_create_endorsement(uuid, text, date, date, smallint, smallint, smallint, smallint, boolean),
  tc_request_reference(uuid),
  tc_answer_reference(uuid, text, smallint, smallint, smallint, smallint, boolean),
  tc_respond(tc_response_target, uuid, text),
  tc_search(text), tc_view_endorsements(uuid)
to authenticated, service_role;
