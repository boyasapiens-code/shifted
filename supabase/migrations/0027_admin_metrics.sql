-- ===========================================================================
-- 0027 — Admin metrics
-- ---------------------------------------------------------------------------
-- A single security-definer function that returns marketplace-health numbers
-- as one jsonb blob. CLAUDE.md asks us to instrument: active jobs, applies,
-- hires, time-to-fill, repeat employers. This is the read side of that.
--
-- Why security-definer + an internal is_admin() gate (not raw table SELECT):
-- admins have no broad cross-employer read policy on jobs/applications/
-- engagements, and we don't want to add one. The function aggregates server
-- side and returns only counts — never raw rows, never worker PII. It fails
-- closed: a non-admin caller gets an exception, not an empty result.
-- ===========================================================================

create or replace function admin_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not is_admin() then
    raise exception 'admin_metrics: not authorized';
  end if;

  select jsonb_build_object(
    'generated_at', now(),

    -- Liquidity: supply (jobs) and demand (applies)
    'jobs_active',      (select count(*) from jobs where status = 'published'),
    'jobs_total',       (select count(*) from jobs),
    'jobs_new_30d',     (select count(*) from jobs where created_at >= now() - interval '30 days'),
    'applies_total',    (select count(*) from applications),
    'applies_30d',      (select count(*) from applications where created_at >= now() - interval '30 days'),

    -- Outcomes
    'hires_total',      (select count(*) from applications where status = 'hired'),
    'hires_30d',        (select count(*) from applications
                          where status = 'hired' and updated_at >= now() - interval '30 days'),

    -- Accounts
    'employers_total',  (select count(*) from employer_profiles),
    'candidates_total', (select count(*) from candidate_profiles),

    -- Repeat employers: posted 2+ jobs ever (came back to use the platform)
    'repeat_employers', (
      select count(*) from (
        select employer_id from jobs group by employer_id having count(*) >= 2
      ) r
    ),

    -- Time-to-fill: per filled job, days from posting to its first hire.
    -- Posting time = published_at, falling back to created_at. The hire moment
    -- is approximated by the hired application's updated_at (last transition).
    -- Reported as median + average over jobs that actually have a hire.
    'time_to_fill_median_days', (
      select round(percentile_cont(0.5) within group (order by ttf)::numeric, 1)
      from (
        select extract(epoch from (
                 min(a.updated_at) - coalesce(j.published_at, j.created_at)
               )) / 86400.0 as ttf
        from applications a
        join jobs j on j.id = a.job_id
        where a.status = 'hired'
        group by a.job_id, j.published_at, j.created_at
      ) t
      where ttf >= 0
    ),
    'time_to_fill_avg_days', (
      select round(avg(ttf)::numeric, 1)
      from (
        select extract(epoch from (
                 min(a.updated_at) - coalesce(j.published_at, j.created_at)
               )) / 86400.0 as ttf
        from applications a
        join jobs j on j.id = a.job_id
        where a.status = 'hired'
        group by a.job_id, j.published_at, j.created_at
      ) t
      where ttf >= 0
    ),
    'jobs_filled', (
      select count(distinct job_id) from applications where status = 'hired'
    ),

    -- Funnel: applications by status (applied → … → hired/rejected).
    -- status is an enum — cast to text so it can be a jsonb object key.
    'application_funnel', coalesce((
      select jsonb_object_agg(status, n)
      from (select status::text as status, count(*) n from applications group by status) s
    ), '{}'::jsonb),

    -- Supply by status (draft / published / closed)
    'jobs_by_status', coalesce((
      select jsonb_object_agg(status, n)
      from (select status::text as status, count(*) n from jobs group by status) s
    ), '{}'::jsonb)
  ) into result;

  return result;
end;
$$;

-- Authenticated only; the function itself enforces is_admin(). Never anon.
revoke all on function admin_metrics() from public;
grant execute on function admin_metrics() to authenticated;
