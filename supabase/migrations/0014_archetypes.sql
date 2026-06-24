-- SHIFTED — workforce archetypes (Phase B entry layer).
-- A behavioral archetype derived from a short assessment; re-testable.
-- Stored on the worker profile; the fit engine lives in app code (lib/archetypes).
-- Run after 0001–0013.

alter table candidate_profiles add column archetype text;
alter table candidate_profiles add column archetype_scores jsonb;
alter table candidate_profiles add column archetype_taken_at timestamptz;

create index candidate_profiles_archetype_idx on candidate_profiles (archetype);
