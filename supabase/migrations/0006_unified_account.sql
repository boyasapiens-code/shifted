-- SHIFTED — unified account.
-- One account can hold BOTH a candidate (worker) and an employer profile.
-- `active_view` remembers which side the toggle is on; capability is derived
-- from which profile rows exist. `profiles.role` is kept for back-compat/admin
-- but no longer enforces exclusivity.
-- Run after 0001–0005.

create type account_view as enum ('worker', 'employer');

alter table profiles add column active_view account_view;

-- Backfill from the existing single role.
update profiles
set active_view = case when role = 'employer' then 'employer'::account_view
                       else 'worker'::account_view end
where active_view is null and role is not null;
