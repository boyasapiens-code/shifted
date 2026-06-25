import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

// Markdown-driven content (same approach as the rights hub). Add a post or a
// spotlight by dropping a .md file in — no code changes.

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

const dir = (kind: string) => path.join(process.cwd(), "content", "marketing", kind);
const html = (md: string) => (md ? (marked.parse(md, { async: false }) as string) : "");

function readTimeOf(body: string): number {
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

// Split a spotlight body by its ## headings.
function spotlightSections(body: string) {
  const out: Record<string, string> = {};
  let cur = "";
  const buf: string[] = [];
  const flush = () => {
    if (cur) out[cur] = html(buf.splice(0).join("\n").trim());
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

function listMd(kind: string): string[] {
  const d = dir(kind);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""));
}

export function getAllIdeas(): Idea[] {
  return listMd("ideas")
    .map(loadIdea)
    .filter((a): a is Idea => !!a)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export function loadIdea(slug: string): Idea | null {
  const file = path.join(dir("ideas"), `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  return {
    slug: data.slug ?? slug,
    title: data.title ?? slug,
    excerpt: data.excerpt ?? "",
    category: data.category ?? "Operations & Growth",
    coverImage: data.coverImage ?? null,
    author: data.author ?? { name: "SHIFTED", role: "Operators" },
    readTime: data.readTime ?? readTimeOf(content),
    publishedAt: data.publishedAt ? String(data.publishedAt) : "",
    featured: data.featured ?? false,
    ctaType: data.ctaType ?? "solutions",
    bodyHtml: html(content),
    seo: data.seo ?? {},
  };
}

export function getAllSpotlights(): Spotlight[] {
  return listMd("spotlights")
    .map(loadSpotlight)
    .filter((s): s is Spotlight => !!s)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export function loadSpotlight(slug: string): Spotlight | null {
  const file = path.join(dir("spotlights"), `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  return {
    slug: data.slug ?? slug,
    businessName: data.businessName ?? slug,
    logo: data.logo ?? null,
    heroImage: data.heroImage ?? null,
    category: data.category ?? "other",
    area: data.area ?? "",
    foundedYear: data.foundedYear ?? null,
    socials: data.socials ?? [],
    website: data.website ?? null,
    shiftedEmployerId: data.shiftedEmployerId ?? null,
    featured: data.featured ?? false,
    publishedAt: data.publishedAt ? String(data.publishedAt) : "",
    sections: spotlightSections(content),
    seo: data.seo ?? {},
  };
}
