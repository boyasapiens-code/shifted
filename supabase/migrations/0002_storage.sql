-- SHIFTED — storage buckets for profile & company media.
-- Run after 0001_init.sql.
--
-- Path convention: every object is stored under the owner's user id as the first
-- folder segment, i.e. `${auth.uid()}/<file>`. RLS keys off that segment.

-- ---------------------------------------------------------------------------
-- Buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('avatars',   'avatars',   true),   -- candidate / user avatars
  ('portfolio', 'portfolio', true),   -- candidate portfolio images
  ('company',   'company',   true),   -- employer logo, cover, workplace photos
  ('resumes',   'resumes',   false)   -- private: owner-only (signed URLs)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Helper: object is owned by the current user (first path segment = uid)
-- ---------------------------------------------------------------------------
-- (storage.foldername(name))[1] is the first folder in the object path.

-- Public-readable image buckets ---------------------------------------------
create policy "media public read"
  on storage.objects for select
  using (bucket_id in ('avatars', 'portfolio', 'company'));

create policy "media owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'portfolio', 'company')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "media owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('avatars', 'portfolio', 'company')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "media owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('avatars', 'portfolio', 'company')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Private resumes — owner only (read via signed URL) -------------------------
create policy "resumes owner all"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );
