-- ===========================================================================
-- 0034 — Fix rights_articles public-read policy to match app-level visibility
-- ---------------------------------------------------------------------------
-- 0033's "rights public read" policy gated on status = 'published'. But the
-- app's own definition of "publicly visible" (lib/rights.ts, unchanged
-- across the Markdown → DB migration) has always been status <> 'draft' —
-- 'legal-review' articles are shown too, just without the "published"
-- guardrail (sources/last_reviewed/disclaimer required, enforced in
-- lib/rights.ts's toArticle()). RLS was stricter than the app: it silently
-- zeroed out every migrated article before the app-level filter ever ran,
-- since all 6 rights articles are currently 'legal-review', not
-- 'published'. Caught immediately via local preview (empty rights hub)
-- before this shipped to production.
--
-- marketing_ideas/marketing_spotlights are unaffected — those use a plain
-- `published` boolean (not a status enum), and the migration script set it
-- true for every existing file, matching their actual live-today status.
-- ===========================================================================

drop policy if exists "rights public read" on rights_articles;
create policy "rights public read" on rights_articles for select
  using (status <> 'draft' or is_admin());
