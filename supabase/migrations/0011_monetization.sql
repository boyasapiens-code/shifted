-- SHIFTED — monetization stubs.
-- Free for workers; employers pay for reach. Billing is STUBBED — these model
-- the surfaces (plan, boosted jobs, featured employers) so the flows work end
-- to end; payment processing is intentionally out of scope. Run after 0001–0010.

create type plan_tier as enum ('free', 'pro');

alter table employer_profiles add column plan plan_tier not null default 'free';
alter table employer_profiles add column plan_since timestamptz;
alter table employer_profiles add column featured boolean not null default false;

-- A job is "promoted" while boosted_until is in the future.
alter table jobs add column boosted_until timestamptz;

create index jobs_boosted_idx on jobs (boosted_until desc nulls last);
