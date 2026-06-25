-- SHIFTED — foundation hardening: rate limiting + PDPA data-subject requests.
-- Run after 0001–0022.

-- ── Rate limiting (serverless-safe, DB-backed fixed window) ──────────────────
create table rate_limits (
  key          text not null,
  window_start timestamptz not null,
  count        int not null default 0,
  primary key (key, window_start)
);

-- Returns true if the action is ALLOWED (under the limit), false if throttled.
create or replace function check_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare w timestamptz; c int;
begin
  w := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into rate_limits (key, window_start, count) values (p_key, w, 1)
    on conflict (key, window_start) do update set count = rate_limits.count + 1
    returning count into c;
  return c <= p_max;
end;
$$;

-- Only reachable through the function (which is security-definer). No direct access.
alter table rate_limits enable row level security;
grant execute on function check_rate_limit(text, int, int) to anon, authenticated, service_role;

-- ── PDPA data-subject requests (access / deletion) ───────────────────────────
create table data_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles (id) on delete cascade,
  email      text,
  kind       text not null check (kind in ('export', 'delete')),
  status     text not null default 'open' check (status in ('open', 'done', 'rejected')),
  note       text,
  created_at timestamptz not null default now()
);
create index data_requests_status_idx on data_requests (status, created_at desc);

alter table data_requests enable row level security;
create policy "dr insert own"  on data_requests for insert with check (auth.uid() = user_id);
create policy "dr read own"    on data_requests for select using (auth.uid() = user_id or is_admin());
create policy "dr admin update" on data_requests for update using (is_admin()) with check (is_admin());

grant select, insert on data_requests to authenticated, service_role;
grant update on data_requests to authenticated, service_role;
