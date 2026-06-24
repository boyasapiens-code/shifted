-- SHIFTED — Worker Reputation System v1.
-- Objective behaviour dominates; subjective stars are a minor input. Protect the
-- scarce worker side: a low score reduces ranking and shows a recovery panel —
-- it never bans. Suspension is for verified misconduct only (incl. 3+ no-shows).
-- Thresholds (35/60), weights, and the 90-day window are test hypotheses.
-- Run after 0001–0016.

alter table candidate_profiles add column reputation_state text not null default 'building';
alter table candidate_profiles add column rated_shifts int not null default 0;

-- Reliability = 100 − no_show%×50 − late_cancel%×25 − late_arrival%×10 + star_adj,
-- over a rolling 90-day window. Stars: (avg−3)/2×15, ±15 max.
create or replace function refresh_reliability(uid uuid)
returns void language plpgsql as $$
declare
  win   interval := interval '90 days';
  n     int;        -- shift outcomes in window
  ns    int;        -- no-shows
  la    int;        -- late arrivals
  lc    int;        -- late cancels (cancelled engagements)
  total int;
  ravg  numeric;
  rcnt  int;
  star_adj numeric := 0;
  score int;
  st    text;
begin
  select
    count(*) filter (where attendance in ('on_time', 'late', 'no_show')),
    count(*) filter (where attendance = 'no_show'),
    count(*) filter (where attendance = 'late')
  into n, ns, la
  from engagements
  where worker_id = uid and status = 'completed'
    and coalesce(completed_at, created_at) > now() - win;

  select count(*) into lc from engagements
  where worker_id = uid and status = 'cancelled'
    and coalesce(updated_at, created_at) > now() - win;

  total := coalesce(n, 0) + coalesce(lc, 0);

  select rating_avg, rating_count into ravg, rcnt
  from candidate_profiles where id = uid;
  if coalesce(rcnt, 0) > 0 and ravg is not null then
    star_adj := (ravg - 3.0) / 2.0 * 15;
  end if;

  if total = 0 then
    update candidate_profiles
      set reliability_score = null, rated_shifts = 0, reputation_state = 'building'
      where id = uid;
    return;
  end if;

  score := round(
    100
    - (ns::numeric / total) * 50
    - (lc::numeric / total) * 25
    - (la::numeric / total) * 10
    + star_adj
  );
  score := greatest(0, least(100, score));

  -- State machine. 3+ no-shows in window = a verified objective violation.
  if coalesce(ns, 0) >= 3 then st := 'suspended';
  elsif total < 5 then st := 'building';        -- minimum sample gate
  elsif score >= 60 then st := 'active';
  else st := 'at_risk';                          -- 35–59: reduced ranking, recovery
  end if;

  update candidate_profiles
    set reliability_score = score, rated_shifts = total, reputation_state = st
    where id = uid;
end;
$$;

-- Reviews change the star input → also refresh reliability for the worker.
create or replace function trg_reviews_aggregates()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform refresh_review_aggregates(old.subject_id);
    perform refresh_reliability(old.subject_id);
    return old;
  end if;
  perform refresh_review_aggregates(new.subject_id);
  perform refresh_reliability(new.subject_id);
  if tg_op = 'UPDATE' and new.subject_id <> old.subject_id then
    perform refresh_review_aggregates(old.subject_id);
    perform refresh_reliability(old.subject_id);
  end if;
  return new;
end;
$$;

-- Backfill all existing workers under the new model.
do $$
declare r record;
begin
  for r in select id from candidate_profiles loop
    perform refresh_reliability(r.id);
  end loop;
end $$;
