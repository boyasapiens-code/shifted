#!/usr/bin/env node
// One-off migration: loads content/rights/**/*.md and content/marketing/**/*.md
// into the new rights_articles / marketing_ideas / marketing_spotlights tables
// (migration 0033), reusing the exact same parsing logic already proven in
// lib/rights.ts / lib/marketing-content.ts (frontmatter shape, section
// splitting, the published-article guardrail) rather than re-deriving it.
// Idempotent: upserts on the same unique keys the tables define, safe to
// re-run. Does NOT touch or delete the source .md files — those stay as a
// reference/rollback copy until the DB-backed path is verified live.
//
// Usage: node scripts/migrate-content-to-db.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

if (!globalThis.WebSocket) {
  const { default: WebSocket } = await import("ws");
  globalThis.WebSocket = WebSocket;
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

// gray-matter/js-yaml auto-parses "date-looking" frontmatter values (e.g.
// last_reviewed: 2026-07-06) into native JS Date objects — String(date)
// produces a format Postgres's `date` type can't parse ("time zone
// \"gmt+0700\" not recognized"). Normalize to a plain YYYY-MM-DD string.
function toDateStr(v) {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// ── Rights articles — same section-splitting logic as lib/rights.ts ────────
const SECTION_HEADINGS = {
  "the quick version": "quick",
  "สรุปสั้น ๆ": "quick",
  "สรุปสั้นๆ": "quick",
  "what the law says": "law",
  "กฎหมายว่าอย่างไร": "law",
  "both sides": "both",
  "ทั้งสองฝ่าย": "both",
  "myths & gray areas": "myths",
  "ความเข้าใจผิดและจุดที่คลุมเครือ": "myths",
  "what good looks like": "good",
  "แนวทางที่ดีควรเป็นอย่างไร": "good",
};

function parseSections(body) {
  const out = {};
  let current = "";
  let buf = [];
  const flush = () => {
    if (current) out[current] = buf.splice(0).join("\n").trim();
    else buf.splice(0);
  };
  for (const line of body.split("\n")) {
    const h2 = line.match(/^##\s+(.+)/);
    if (h2) {
      flush();
      current = SECTION_HEADINGS[h2[1].trim().toLowerCase()] ?? h2[1].trim().toLowerCase();
    } else {
      buf.push(line);
    }
  }
  flush();

  let employees = "";
  let employers = "";
  const both = out["both"] ?? "";
  for (const part of both.split(/^###\s+/m)) {
    const nl = part.indexOf("\n");
    if (nl < 0) continue;
    const head = part.slice(0, nl).trim().toLowerCase();
    const content = part.slice(nl + 1).trim();
    if (head.includes("employee") || head.includes("ลูกจ้าง")) employees = content;
    else if (head.includes("employer") || head.includes("นายจ้าง")) employers = content;
  }

  return {
    quick: out["quick"] ?? "",
    law: out["law"] ?? "",
    employees,
    employers,
    myths: out["myths"] ?? "",
    good: out["good"] ?? "",
  };
}

let rightsCount = 0;
for (const lang of ["en", "th"]) {
  const dir = join(root, "content", "rights", lang);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const slug = f.replace(/\.md$/, "");
    const { data, content } = matter(readFileSync(join(dir, f), "utf8"));
    const sections = parseSections(content);
    const row = {
      slug: data.slug ?? slug,
      lang,
      title: data.title ?? slug,
      summary: data.summary ?? "",
      category: data.category ?? "pay-and-money",
      audience: data.audience ?? "both",
      last_reviewed: toDateStr(data.last_reviewed),
      review_cadence: data.review_cadence ?? "quarterly",
      status: data.status ?? "draft",
      related: data.related ?? [],
      keywords: data.seo?.keywords ?? [],
      sources: data.sources ?? [],
      disclaimer: data.disclaimer === true,
      section_quick: sections.quick,
      section_law: sections.law,
      section_employees: sections.employees,
      section_employers: sections.employers,
      section_myths: sections.myths,
      section_good: sections.good,
    };
    const { error } = await supabase.from("rights_articles").upsert(row, { onConflict: "slug,lang" });
    if (error) throw new Error(`rights_articles ${slug}/${lang}: ${error.message}`);
    rightsCount++;
  }
}
console.log(`✓ migrated ${rightsCount} rights articles`);

// ── Marketing ideas ──────────────────────────────────────────────────────
function readTimeOf(body) {
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

let ideasCount = 0;
const ideasDir = join(root, "content", "marketing", "ideas");
if (existsSync(ideasDir)) {
  for (const f of readdirSync(ideasDir).filter((f) => f.endsWith(".md"))) {
    const slug = f.replace(/\.md$/, "");
    const { data, content } = matter(readFileSync(join(ideasDir, f), "utf8"));
    const row = {
      slug: data.slug ?? slug,
      title: data.title ?? slug,
      excerpt: data.excerpt ?? "",
      category: data.category ?? "Operations & Growth",
      cover_image: data.coverImage ?? null,
      author_name: data.author?.name ?? "SHIFTED",
      author_role: data.author?.role ?? "Operators",
      read_time: data.readTime ?? readTimeOf(content),
      published: true, // every existing file is already live today
      published_at: toDateStr(data.publishedAt),
      featured: data.featured ?? false,
      cta_type: data.ctaType ?? "solutions",
      body_markdown: content,
      seo_meta_title: data.seo?.metaTitle ?? null,
      seo_meta_description: data.seo?.metaDescription ?? null,
      seo_og_image: data.seo?.ogImage ?? null,
    };
    const { error } = await supabase.from("marketing_ideas").upsert(row, { onConflict: "slug" });
    if (error) throw new Error(`marketing_ideas ${slug}: ${error.message}`);
    ideasCount++;
  }
}
console.log(`✓ migrated ${ideasCount} marketing ideas`);

// ── Marketing spotlights ─────────────────────────────────────────────────
function spotlightSections(body) {
  const out = {};
  let cur = "";
  let buf = [];
  const flush = () => {
    if (cur) out[cur] = buf.splice(0).join("\n").trim();
    else buf.splice(0);
  };
  for (const line of body.split("\n")) {
    const h2 = line.match(/^##\s+(.+)/);
    if (h2) {
      flush();
      cur = h2[1].trim().toLowerCase();
    } else buf.push(line);
  }
  flush();
  return {
    story: out["the story"] ?? "",
    culture: out["the culture"] ?? "",
    knownFor: out["what they're known for"] ?? out["what they’re known for"] ?? "",
  };
}

let spotlightsCount = 0;
const spotlightsDir = join(root, "content", "marketing", "spotlights");
if (existsSync(spotlightsDir)) {
  for (const f of readdirSync(spotlightsDir).filter((f) => f.endsWith(".md"))) {
    const slug = f.replace(/\.md$/, "");
    const { data, content } = matter(readFileSync(join(spotlightsDir, f), "utf8"));
    const sections = spotlightSections(content);
    const row = {
      slug: data.slug ?? slug,
      business_name: data.businessName ?? slug,
      logo: data.logo ?? null,
      hero_image: data.heroImage ?? null,
      category: data.category ?? "other",
      area: data.area ?? "",
      founded_year: data.foundedYear ?? null,
      socials: data.socials ?? [],
      website: data.website ?? null,
      shifted_employer_id: data.shiftedEmployerId ?? null,
      published: true, // every existing file is already live today
      published_at: toDateStr(data.publishedAt),
      featured: data.featured ?? false,
      section_story: sections.story, // stored as raw markdown, not pre-rendered html
      section_culture: sections.culture,
      section_known_for: sections.knownFor,
      seo_meta_title: data.seo?.metaTitle ?? null,
      seo_meta_description: data.seo?.metaDescription ?? null,
      seo_og_image: data.seo?.ogImage ?? null,
    };
    const { error } = await supabase.from("marketing_spotlights").upsert(row, { onConflict: "slug" });
    if (error) throw new Error(`marketing_spotlights ${slug}: ${error.message}`);
    spotlightsCount++;
  }
}
console.log(`✓ migrated ${spotlightsCount} marketing spotlights`);

console.log("\nDone. Source .md files under content/ are untouched — safe to remove once the DB-backed pages are verified live.");
