-- ===========================================================================
-- 0032 — Close an INSERT-time bypass on employer_profiles_guard_plan
-- ---------------------------------------------------------------------------
-- employer_profiles_guard_plan_trg (0031) only fired BEFORE UPDATE. A
-- first-time employer_profiles row insert — the "employers: insert own" RLS
-- policy (0001_init.sql) has no column restriction beyond `auth.uid() = id`
-- — could set `plan` directly to 'pro'/'growth' at row creation, bypassing
-- the guard entirely: a fresh insert never takes the UPDATE path the guard
-- covers, even via `.upsert()` (Postgres only fires BEFORE UPDATE when a
-- conflicting row already exists). Found by a post-ship audit before this
-- had a chance to be exploited or to matter financially (test-mode key).
--
-- Fix: fire the same trigger on INSERT too. No change to the function body
-- needed — `old` is NULL on insert, and `new.plan is distinct from old.plan`
-- is already TRUE whenever new.plan is non-null and old is null (IS
-- DISTINCT FROM treats NULL as a distinct value), so the existing
-- `and new.plan in ('pro','growth')` check gates exactly the same thing on
-- both insert and update. Normal signups are unaffected: onboarding never
-- sets `plan` explicitly, so it lands on its 'free' column default, which
-- isn't in ('pro','growth') and isn't blocked.
-- ===========================================================================

drop trigger if exists employer_profiles_guard_plan_trg on employer_profiles;

create trigger employer_profiles_guard_plan_trg
  before insert or update on employer_profiles
  for each row execute function employer_profiles_guard_plan();
