-- ===========================================================================
-- 0029 — has_unread_messages()
-- ---------------------------------------------------------------------------
-- The site header previously SELECTed every one of a user's conversation rows
-- on each render just to compute one boolean (is anything unread?). Replace
-- that with a single security-definer EXISTS. It only ever reveals the CALLER's
-- own unread state (filtered by auth.uid()), so it returns a bare boolean and
-- leaks nothing.
-- ===========================================================================

create or replace function has_unread_messages()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from conversations c
    where (c.employer_id = auth.uid()
           and (c.employer_last_read_at is null
                or c.last_message_at > c.employer_last_read_at))
       or (c.worker_id = auth.uid()
           and (c.worker_last_read_at is null
                or c.last_message_at > c.worker_last_read_at))
  );
$$;

revoke all on function has_unread_messages() from public;
grant execute on function has_unread_messages() to authenticated;
