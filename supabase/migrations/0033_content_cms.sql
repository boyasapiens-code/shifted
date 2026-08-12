-- ===========================================================================
-- 0033 — Rights articles & marketing content move from git Markdown to DB
-- ---------------------------------------------------------------------------
-- Replaces content/rights/**/*.md and content/marketing/**/*.md (previously
-- read via lib/rights.ts / lib/marketing-content.ts + a build-time generator,
-- scripts/generate-content.mjs, added for Cloudflare Workers compatibility)
-- with real tables, editable from a new /admin/content UI instead of
-- hand-editing Markdown and pushing git commits. No new CMS vendor, no new
-- database — just extends the existing Supabase Postgres DB every other
-- part of the app already uses.
--
-- Public read (this content is public-facing marketing/legal-info), admin-
-- only write — same shape as the questions bank (0025): "public read
-- (using true, or a status filter)" + "admin write (is_admin())".
-- ===========================================================================

create table rights_articles (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null,
  lang              text not null check (lang in ('en', 'th')),
  title             text not null,
  summary           text not null default '',
  category          text not null,
  audience          text not null default 'both' check (audience in ('both', 'employee', 'employer')),
  last_reviewed     date,
  review_cadence    text not null default 'quarterly' check (review_cadence in ('monthly', 'quarterly', 'on-law-change')),
  status            text not null default 'draft' check (status in ('draft', 'legal-review', 'published')),
  related           text[] not null default '{}',
  keywords          text[] not null default '{}',
  sources           jsonb not null default '[]', -- [{ "title", "url" }]
  disclaimer        boolean not null default false,
  section_quick     text not null default '',
  section_law       text not null default '',
  section_employees text not null default '',
  section_employers text not null default '',
  section_myths     text not null default '',
  section_good      text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (slug, lang)
);
create index rights_articles_slug_idx on rights_articles (slug);
create trigger rights_articles_set_updated_at before update on rights_articles
  for each row execute function set_updated_at();

create table marketing_ideas (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  title                 text not null,
  excerpt               text not null default '',
  category              text not null default 'Operations & Growth',
  cover_image           text,
  author_name           text not null default 'SHIFTED',
  author_role           text not null default 'Operators',
  read_time             int,
  published             boolean not null default false,
  published_at          date,
  featured              boolean not null default false,
  cta_type              text not null default 'solutions' check (cta_type in ('booyah', 'shifted-hire', 'solutions')),
  body_markdown         text not null default '',
  seo_meta_title        text,
  seo_meta_description  text,
  seo_og_image          text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create trigger marketing_ideas_set_updated_at before update on marketing_ideas
  for each row execute function set_updated_at();

create table marketing_spotlights (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  business_name         text not null,
  logo                  text,
  hero_image            text,
  category              text not null default 'other',
  area                  text not null default '',
  founded_year          int,
  socials               jsonb not null default '[]', -- [{ "label", "url" }]
  website               text,
  shifted_employer_id   uuid references employer_profiles (id) on delete set null,
  published             boolean not null default false,
  published_at          date,
  featured              boolean not null default false,
  section_story         text not null default '',
  section_culture       text not null default '',
  section_known_for     text not null default '',
  seo_meta_title        text,
  seo_meta_description  text,
  seo_og_image          text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create trigger marketing_spotlights_set_updated_at before update on marketing_spotlights
  for each row execute function set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table rights_articles      enable row level security;
alter table marketing_ideas      enable row level security;
alter table marketing_spotlights enable row level security;

-- Public site pages only ever want status = 'published' (matches
-- getAllRightsArticles()/getRightsArticle() already filtering out drafts
-- today) — draft / legal-review rows stay admin-only so unreviewed
-- compliance claims never leak publicly. Admin UI (is_admin()) needs every
-- status to actually edit drafts.
create policy "rights public read" on rights_articles for select
  using (status = 'published' or is_admin());
create policy "rights admin write" on rights_articles for all
  using (is_admin()) with check (is_admin());

create policy "ideas public read" on marketing_ideas for select
  using (published or is_admin());
create policy "ideas admin write" on marketing_ideas for all
  using (is_admin()) with check (is_admin());

create policy "spotlights public read" on marketing_spotlights for select
  using (published or is_admin());
create policy "spotlights admin write" on marketing_spotlights for all
  using (is_admin()) with check (is_admin());

grant select on rights_articles, marketing_ideas, marketing_spotlights
  to anon, authenticated, service_role;
grant insert, update, delete on rights_articles, marketing_ideas, marketing_spotlights
  to authenticated, service_role;
