-- SHIFTED — RLS hardening (from the security audit, docs/security-audit.md).
-- Several SELECT policies were written `using (true)`, which applies to the
-- logged-OUT `anon` role too — so worker PII and reputation data were readable
-- by anyone holding the public anon key. Restrict these to authenticated users.
-- (employer_profiles + skills stay public by design: companies/skill catalog.)
-- Run after 0001–0023.

-- Worker personal data (name, phone, bio, location) — never anon-readable.
drop policy if exists "candidates: read for authenticated" on candidate_profiles;
create policy "candidates: read for authenticated" on candidate_profiles
  for select using (auth.uid() is not null);

-- Worker reputation references — authenticated only.
drop policy if exists "refs: authenticated read" on hire_references;
create policy "refs: authenticated read" on hire_references
  for select using (auth.uid() is not null);

-- Worker verified-skill records — authenticated only.
drop policy if exists "ws: public read" on worker_skills;
create policy "ws: authenticated read" on worker_skills
  for select using (auth.uid() is not null);

-- Reviews: authenticated only, AND held/blocked comments stay hidden from
-- everyone except the author, the subject, and admins — so moderation outcomes
-- are enforced at the data layer, not just in the UI.
drop policy if exists "reviews: public read" on reviews;
create policy "reviews: gated read" on reviews
  for select using (
    is_admin()
    or author_id = auth.uid()
    or subject_id = auth.uid()
    or (auth.uid() is not null and comment_status in ('allowed', 'softened'))
  );
