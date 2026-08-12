import { marked } from "marked";
import { createPublicClient } from "@/lib/supabase/public";

// DB-driven content (rights_articles' sibling tables, migration 0033). Add a
// post or a spotlight from /admin/content — no code changes, no deploy.
// Body is stored as raw Markdown in the DB and rendered to HTML here, at
// read time, same as before.

export const IDEA_CATEGORIES = [
  "Hiring & Employer Branding",
  "Local Visibility & SEO",
  "Social & Content",
  "Customer Experience",
  "Retention & Culture",
  "Operations & Growth",
  "Case Studies",
] as const;
export type IdeaCategory = (typeof IDEA_CATEGORIES)[number];

export type CtaType = "booyah" | "shifted-hire" | "solutions";

export interface Idea {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  coverImage: string | null;
  author: { name: string; role: string };
  readTime: number;
  publishedAt: string;
  featured: boolean;
  ctaType: CtaType;
  bodyHtml: string;
  seo: { metaTitle?: string; metaDescription?: string; ogImage?: string };
}

export const SPOTLIGHT_CATEGORIES: { value: string; label: string }[] = [
  { value: "cafe", label: "Café" },
  { value: "bar", label: "Bar" },
  { value: "restaurant", label: "Restaurant" },
  { value: "retail", label: "Retail" },
  { value: "wellness", label: "Wellness" },
  { value: "hotel", label: "Hotel" },
  { value: "other", label: "Other" },
];

export interface Spotlight {
  slug: string;
  businessName: string;
  logo: string | null;
  heroImage: string | null;
  category: string;
  area: string;
  foundedYear: number | null;
  socials: { label: string; url: string }[];
  website: string | null;
  shiftedEmployerId: string | null;
  featured: boolean;
  publishedAt: string;
  sections: { story: string; culture: string; knownFor: string };
  seo: { metaTitle?: string; metaDescription?: string; ogImage?: string };
}

const html = (md: string) => (md ? (marked.parse(md, { async: false }) as string) : "");

function readTimeOf(body: string): number {
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

// ── Ideas ────────────────────────────────────────────────────────────────
// Exported (with `id`) so /admin/content can query+edit the raw row
// directly — the raw row stores unrendered markdown, unlike Idea.bodyHtml.
export type IdeaRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  cover_image: string | null;
  author_name: string;
  author_role: string;
  read_time: number | null;
  published: boolean;
  published_at: string | null;
  featured: boolean;
  cta_type: CtaType;
  body_markdown: string;
  seo_meta_title: string | null;
  seo_meta_description: string | null;
  seo_og_image: string | null;
};

function toIdea(row: IdeaRow): Idea {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    coverImage: row.cover_image,
    author: { name: row.author_name, role: row.author_role },
    readTime: row.read_time ?? readTimeOf(row.body_markdown),
    publishedAt: row.published_at ?? "",
    featured: row.featured,
    ctaType: row.cta_type,
    bodyHtml: html(row.body_markdown),
    seo: {
      metaTitle: row.seo_meta_title ?? undefined,
      metaDescription: row.seo_meta_description ?? undefined,
      ogImage: row.seo_og_image ?? undefined,
    },
  };
}

export async function getAllIdeas(): Promise<Idea[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("marketing_ideas")
    .select("*")
    .eq("published", true)
    .order("published_at", { ascending: false });
  return (data ?? []).map((row) => toIdea(row as IdeaRow));
}

export async function loadIdea(slug: string): Promise<Idea | null> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("marketing_ideas")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  return data ? toIdea(data as IdeaRow) : null;
}

// ── Spotlights ───────────────────────────────────────────────────────────
// Exported (with `id`) so /admin/content can query+edit the raw row
// directly — the raw row stores unrendered markdown section_* columns,
// unlike Spotlight.sections.* (pre-rendered HTML).
export type SpotlightRow = {
  id: string;
  slug: string;
  business_name: string;
  logo: string | null;
  hero_image: string | null;
  category: string;
  area: string;
  founded_year: number | null;
  socials: { label: string; url: string }[];
  website: string | null;
  shifted_employer_id: string | null;
  published: boolean;
  featured: boolean;
  published_at: string | null;
  section_story: string;
  section_culture: string;
  section_known_for: string;
  seo_meta_title: string | null;
  seo_meta_description: string | null;
  seo_og_image: string | null;
};

function toSpotlight(row: SpotlightRow): Spotlight {
  return {
    slug: row.slug,
    businessName: row.business_name,
    logo: row.logo,
    heroImage: row.hero_image,
    category: row.category,
    area: row.area,
    foundedYear: row.founded_year,
    socials: row.socials,
    website: row.website,
    shiftedEmployerId: row.shifted_employer_id,
    featured: row.featured,
    publishedAt: row.published_at ?? "",
    // Sections are stored as raw markdown, rendered to HTML at read time
    // (same contract as before — page components expect pre-rendered HTML).
    sections: {
      story: html(row.section_story),
      culture: html(row.section_culture),
      knownFor: html(row.section_known_for),
    },
    seo: {
      metaTitle: row.seo_meta_title ?? undefined,
      metaDescription: row.seo_meta_description ?? undefined,
      ogImage: row.seo_og_image ?? undefined,
    },
  };
}

export async function getAllSpotlights(): Promise<Spotlight[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("marketing_spotlights")
    .select("*")
    .eq("published", true)
    .order("published_at", { ascending: false });
  return (data ?? []).map((row) => toSpotlight(row as SpotlightRow));
}

export async function loadSpotlight(slug: string): Promise<Spotlight | null> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("marketing_spotlights")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  return data ? toSpotlight(data as SpotlightRow) : null;
}
