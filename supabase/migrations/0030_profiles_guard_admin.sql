-- ===========================================================================
-- Close a privilege-escalation hole: "profiles: update own" (0001_init.sql)
-- lets a user UPDATE their own profiles row with no column restriction and no
-- WITH CHECK — including is_admin. Since is_admin() gates nearly every admin
-- policy in the app (payments, verification queues, Trust Circle reads,
-- moderation, billing_events, marketing leads, admin_metrics(), ...), any
-- authenticated user could self-promote to admin and inherit all of it.
--
-- profiles_guard_admin(): mirrors jobs_guard_boost() (0028_payments.sql) —
-- a trigger that lets ONLY service_role change is_admin. Employers'/
-- candidates' normal profile edits (name, avatar, role, etc.) leave
-- is_admin untouched, so they pass the guard unaffected.
-- ===========================================================================

create or replace function profiles_guard_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_admin is distinct from old.is_admin
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'is_admin can only be changed by the service role';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_admin_trg
  before update on profiles
  for each row execute function profiles_guard_admin();
