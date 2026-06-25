-- SHIFTED — AI moderation engine (SHIFTED_AI_Moderation_Engine.md).
-- Every decision is logged (legal defensibility + worker visibility). Anything
-- attached to a worker's name is visible to that worker — no covert records.
-- Run after 0001–0020.

-- Per-decision audit log. Stores a REDACTED excerpt only — never the raw
-- sensitive/PII payload (PDPA data-minimisation).
create table moderation_decisions (
  id               uuid primary key default gen_random_uuid(),
  content_type     text not null,            -- review | response | message | job_post | profile | console
  content_ref      uuid,                     -- the moderated row, if any
  content_hash     text not null,            -- sha256 of the raw content
  excerpt          text,                     -- redacted, human-readable for the queue
  action           text not null check (action in ('ALLOW','SOFTEN','HOLD','BLOCK')),
  confidence       numeric not null default 0.5,
  legal_codes      text[] not null default '{}',
  policy_codes     text[] not null default '{}',
  escalate         boolean not null default false,
  reason_en        text,
  reason_th        text,
  suggested_rewrite text,
  author_id        uuid,                     -- who wrote the content
  target_id        uuid,                     -- the named party it's about (worker visibility)
  model_version    text not null default 'rules-1',
  review_action    text check (review_action in ('allowed','blocked','edited')),
  reviewer_id      uuid,
  reviewed_at      timestamptz,
  appeal_status    text not null default 'none' check (appeal_status in ('none','requested','upheld','overturned')),
  appeal_note      text,
  created_at       timestamptz not null default now()
);
create index moderation_action_idx on moderation_decisions (action, created_at desc);
create index moderation_target_idx on moderation_decisions (target_id);
create index moderation_author_idx on moderation_decisions (author_id);

-- User "Report" submissions (every post/review has a Report button).
create table content_reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid,
  content_type text not null,
  content_ref  uuid,
  reason       text not null,                -- defamation | privacy | harassment | discrimination | fraud | other | appeal
  detail       text,
  status       text not null default 'open' check (status in ('open','reviewed','actioned','dismissed')),
  created_at   timestamptz not null default now()
);
create index content_reports_status_idx on content_reports (status, created_at desc);

-- Review comments now carry a moderation state; only 'allowed'/'softened' show.
alter table reviews
  add column if not exists comment_status text not null default 'allowed'
    check (comment_status in ('allowed','softened','held','blocked'));

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table moderation_decisions enable row level security;
alter table content_reports      enable row level security;

-- Worker visibility: you can see decisions you authored OR that name you. Admin all.
create policy "mod author/target read" on moderation_decisions for select
  using (author_id = auth.uid() or target_id = auth.uid() or is_admin());
-- Decisions are written server-side on a logged-in user's action.
create policy "mod insert authed" on moderation_decisions for insert
  with check (auth.uid() is not null);
create policy "mod admin update" on moderation_decisions for update
  using (is_admin()) with check (is_admin());

create policy "report insert authed" on content_reports for insert
  with check (auth.uid() is not null);
create policy "report own/admin read" on content_reports for select
  using (reporter_id = auth.uid() or is_admin());
create policy "report admin update" on content_reports for update
  using (is_admin()) with check (is_admin());

grant select, insert on moderation_decisions to authenticated, service_role;
grant update on moderation_decisions to authenticated, service_role;
grant select, insert on content_reports to authenticated, service_role;
grant update on content_reports to authenticated, service_role;
