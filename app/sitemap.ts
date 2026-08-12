import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { RIGHTS_CATEGORIES, getAllRightsArticles } from "@/lib/rights";
import { getAllIdeas, getAllSpotlights } from "@/lib/marketing-content";

// Public, indexable routes only (authed areas are disallowed in robots.ts).
const STATIC = [
  "", "/jobs", "/talent", "/about",
  "/marketing-solutions", "/marketing-solutions/ideas",
  "/marketing-solutions/spotlights", "/marketing-solutions/solutions",
  "/community-guidelines", "/rights", "/legal", "/safety-center",
  "/talent-solutions", "/small-business", "/signup", "/login",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base = STATIC.map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
  }));

  const categories = RIGHTS_CATEGORIES.map((c) => ({
    url: `${SITE_URL}/rights/${c.id}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
  }));

  const [rightsArticles, allIdeas, allSpotlights] = await Promise.all([
    getAllRightsArticles(),
    getAllIdeas(),
    getAllSpotlights(),
  ]);

  const articles = rightsArticles.map((a) => ({
    url: `${SITE_URL}/rights/${a.category}/${a.slug}`,
    lastModified: a.last_reviewed ? new Date(a.last_reviewed) : now,
    changeFrequency: "monthly" as const,
  }));

  const ideas = allIdeas.map((i) => ({
    url: `${SITE_URL}/marketing-solutions/ideas/${i.slug}`,
    lastModified: i.publishedAt ? new Date(i.publishedAt) : now,
    changeFrequency: "monthly" as const,
  }));

  const spotlights = allSpotlights.map((s) => ({
    url: `${SITE_URL}/marketing-solutions/spotlights/${s.slug}`,
    lastModified: s.publishedAt ? new Date(s.publishedAt) : now,
    changeFrequency: "monthly" as const,
  }));

  return [...base, ...categories, ...articles, ...ideas, ...spotlights];
}
