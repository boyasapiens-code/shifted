-- SHIFTED — categorization & matching (SHIFTED_Categorization_Matching_Spec.md).
-- Adds the structured, OPTIONAL taxonomy fields both sides can fill so matching
-- is apples-to-apples. Everything is nullable — the matcher degrades gracefully
-- and never blocks on a missing field. Run after 0001–0021.
--
-- Compliance §7 (PDPA): worker precise lat/lng and age are NOT stored on the
-- public candidate_profiles row. Job venue lat/lng is fine (business location).
-- Commute therefore matches on coarse district for workers — never exact coords.

-- Job side (employer-owned, public).
alter table jobs
  add column if not exists role text,
  add column if not exists district text,
  add column if not exists lat numeric,
  add column if not exists lng numeric,
  add column if not exists days_needed text[] not null default '{}',
  add column if not exists time_blocks_needed text[] not null default '{}',
  add column if not exists hours_per_week int,
  add column if not exists experience_preferred int,
  add column if not exists certs_required text[] not null default '{}',
  add column if not exists min_age int not null default 18,
  add column if not exists work_eligibility_required text not null default 'any';

-- Worker side. NO lat/lng, NO age here (PDPA §7) — district is the public unit.
alter table candidate_profiles
  add column if not exists roles text[] not null default '{}',
  add column if not exists experience_tier int,
  add column if not exists expected_rate_hourly int,
  add column if not exists current_rate_hourly int,
  add column if not exists rate_flexibility_pct int not null default 15,
  add column if not exists residence_district text,
  add column if not exists preferred_districts text[] not null default '{}',
  add column if not exists max_commute_minutes int,
  add column if not exists available_days text[] not null default '{}',
  add column if not exists available_time_blocks text[] not null default '{}',
  add column if not exists desired_hours_per_week int,
  add column if not exists work_eligibility text,
  add column if not exists match_visibility text not null default 'open';

-- Backfill experience tier from existing years_experience (ordinal §1.4).
update candidate_profiles
set experience_tier = case
  when years_experience <= 0 then 1
  when years_experience < 2 then 2
  when years_experience < 5 then 3
  else 4 end
where experience_tier is null;
