-- SHIFTED — grant the Supabase API roles access to the public schema.
-- Needed on projects where default privileges weren't applied to the API roles
-- (observed with the new sb_publishable_/sb_secret_ key system): without this,
-- the data API returns "42501 permission denied for table ...".
--
-- Row-Level Security still governs what `anon` / `authenticated` can actually
-- read or write — these are table-level privileges only. `service_role` bypasses
-- RLS (used server-side, e.g. the seed script).

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions  in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
