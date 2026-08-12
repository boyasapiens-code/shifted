"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  toList,
  numOrNull,
  dateOrNull,
  textOrNull,
  sourcesFromLines,
  socialsFromLines,
} from "@/lib/admin-content-format";

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/content");
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) redirect("/");
  return { supabase, user };
}

const today = () => new Date().toISOString().slice(0, 10);

// ── Rights articles ─────────────────────────────────────────────────────
export async function saveRightsArticle(id: string | null, formData: FormData) {
  const { supabase } = await requireAdminUser();

  let oldSlug: string | null = null;
  let oldCategory: string | null = null;
  if (id) {
    const { data: existing } = await supabase
      .from("rights_articles")
      .select("slug, category")
      .eq("id", id)
      .single();
    oldSlug = existing?.slug ?? null;
    oldCategory = existing?.category ?? null;
  }

  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!slug || !title) {
    redirect(`/admin/content/rights/${id ?? "new"}?error=${encodeURIComponent("Slug and title are required.")}`);
  }

  const category = String(formData.get("category") ?? "pay-and-money");
  const row = {
    slug,
    lang: String(formData.get("lang") ?? "en"),
    title,
    summary: String(formData.get("summary") ?? "").trim(),
    category,
    audience: String(formData.get("audience") ?? "both"),
    last_reviewed: dateOrNull(formData.get("last_reviewed")),
    review_cadence: String(formData.get("review_cadence") ?? "quarterly"),
    status: String(formData.get("status") ?? "draft"),
    related: toList(formData.get("related")),
    keywords: toList(formData.get("keywords")),
    sources: sourcesFromLines(formData.get("sources")),
    disclaimer: formData.get("disclaimer") === "on",
    section_quick: String(formData.get("section_quick") ?? ""),
    section_law: String(formData.get("section_law") ?? ""),
    section_employees: String(formData.get("section_employees") ?? ""),
    section_employers: String(formData.get("section_employers") ?? ""),
    section_myths: String(formData.get("section_myths") ?? ""),
    section_good: String(formData.get("section_good") ?? ""),
  };

  const { error } = id
    ? await supabase.from("rights_articles").update(row).eq("id", id)
    : await supabase.from("rights_articles").insert(row);
  if (error) {
    redirect(`/admin/content/rights/${id ?? "new"}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/content");
  revalidatePath("/rights");
  revalidatePath(`/rights/${category}`);
  revalidatePath(`/rights/${category}/${slug}`);
  if (oldCategory && oldCategory !== category) revalidatePath(`/rights/${oldCategory}`);
  if (oldSlug && oldSlug !== slug) revalidatePath(`/rights/${oldCategory ?? category}/${oldSlug}`);
  revalidatePath("/sitemap.xml");
  redirect("/admin/content");
}

export async function deleteRightsArticle(id: string) {
  const { supabase } = await requireAdminUser();
  const { data: existing } = await supabase
    .from("rights_articles")
    .select("slug, category")
    .eq("id", id)
    .single();
  await supabase.from("rights_articles").delete().eq("id", id);

  revalidatePath("/admin/content");
  revalidatePath("/rights");
  if (existing) {
    revalidatePath(`/rights/${existing.category}`);
    revalidatePath(`/rights/${existing.category}/${existing.slug}`);
  }
  revalidatePath("/sitemap.xml");
  redirect("/admin/content");
}

// ── Marketing ideas ──────────────────────────────────────────────────────
export async function saveIdea(id: string | null, formData: FormData) {
  const { supabase } = await requireAdminUser();

  let oldSlug: string | null = null;
  if (id) {
    const { data: existing } = await supabase
      .from("marketing_ideas")
      .select("slug")
      .eq("id", id)
      .single();
    oldSlug = existing?.slug ?? null;
  }

  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!slug || !title) {
    redirect(`/admin/content/ideas/${id ?? "new"}?error=${encodeURIComponent("Slug and title are required.")}`);
  }

  const published = formData.get("published") === "on";
  const row = {
    slug,
    title,
    excerpt: String(formData.get("excerpt") ?? "").trim(),
    category: String(formData.get("category") ?? "Operations & Growth"),
    cover_image: textOrNull(formData.get("cover_image")),
    author_name: textOrNull(formData.get("author_name")) ?? "SHIFTED",
    author_role: textOrNull(formData.get("author_role")) ?? "Operators",
    read_time: numOrNull(formData.get("read_time")),
    published,
    published_at: dateOrNull(formData.get("published_at")) ?? (published ? today() : null),
    featured: formData.get("featured") === "on",
    cta_type: String(formData.get("cta_type") ?? "solutions"),
    body_markdown: String(formData.get("body_markdown") ?? ""),
    seo_meta_title: textOrNull(formData.get("seo_meta_title")),
    seo_meta_description: textOrNull(formData.get("seo_meta_description")),
    seo_og_image: textOrNull(formData.get("seo_og_image")),
  };

  const { error } = id
    ? await supabase.from("marketing_ideas").update(row).eq("id", id)
    : await supabase.from("marketing_ideas").insert(row);
  if (error) {
    redirect(`/admin/content/ideas/${id ?? "new"}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/content");
  revalidatePath("/marketing-solutions");
  revalidatePath("/marketing-solutions/ideas");
  revalidatePath(`/marketing-solutions/ideas/${slug}`);
  if (oldSlug && oldSlug !== slug) revalidatePath(`/marketing-solutions/ideas/${oldSlug}`);
  revalidatePath("/sitemap.xml");
  redirect("/admin/content");
}

export async function deleteIdea(id: string) {
  const { supabase } = await requireAdminUser();
  const { data: existing } = await supabase
    .from("marketing_ideas")
    .select("slug")
    .eq("id", id)
    .single();
  await supabase.from("marketing_ideas").delete().eq("id", id);

  revalidatePath("/admin/content");
  revalidatePath("/marketing-solutions");
  revalidatePath("/marketing-solutions/ideas");
  if (existing) revalidatePath(`/marketing-solutions/ideas/${existing.slug}`);
  revalidatePath("/sitemap.xml");
  redirect("/admin/content");
}

// ── Marketing spotlights ─────────────────────────────────────────────────
export async function saveSpotlight(id: string | null, formData: FormData) {
  const { supabase } = await requireAdminUser();

  let oldSlug: string | null = null;
  if (id) {
    const { data: existing } = await supabase
      .from("marketing_spotlights")
      .select("slug")
      .eq("id", id)
      .single();
    oldSlug = existing?.slug ?? null;
  }

  const slug = String(formData.get("slug") ?? "").trim();
  const businessName = String(formData.get("business_name") ?? "").trim();
  if (!slug || !businessName) {
    redirect(`/admin/content/spotlights/${id ?? "new"}?error=${encodeURIComponent("Slug and business name are required.")}`);
  }

  const published = formData.get("published") === "on";
  const row = {
    slug,
    business_name: businessName,
    logo: textOrNull(formData.get("logo")),
    hero_image: textOrNull(formData.get("hero_image")),
    category: String(formData.get("category") ?? "other"),
    area: String(formData.get("area") ?? "").trim(),
    founded_year: numOrNull(formData.get("founded_year")),
    socials: socialsFromLines(formData.get("socials")),
    website: textOrNull(formData.get("website")),
    shifted_employer_id: textOrNull(formData.get("shifted_employer_id")),
    published,
    published_at: dateOrNull(formData.get("published_at")) ?? (published ? today() : null),
    featured: formData.get("featured") === "on",
    section_story: String(formData.get("section_story") ?? ""),
    section_culture: String(formData.get("section_culture") ?? ""),
    section_known_for: String(formData.get("section_known_for") ?? ""),
    seo_meta_title: textOrNull(formData.get("seo_meta_title")),
    seo_meta_description: textOrNull(formData.get("seo_meta_description")),
    seo_og_image: textOrNull(formData.get("seo_og_image")),
  };

  const { error } = id
    ? await supabase.from("marketing_spotlights").update(row).eq("id", id)
    : await supabase.from("marketing_spotlights").insert(row);
  if (error) {
    redirect(`/admin/content/spotlights/${id ?? "new"}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/content");
  revalidatePath("/marketing-solutions");
  revalidatePath("/marketing-solutions/spotlights");
  revalidatePath(`/marketing-solutions/spotlights/${slug}`);
  if (oldSlug && oldSlug !== slug) revalidatePath(`/marketing-solutions/spotlights/${oldSlug}`);
  revalidatePath("/sitemap.xml");
  redirect("/admin/content");
}

export async function deleteSpotlight(id: string) {
  const { supabase } = await requireAdminUser();
  const { data: existing } = await supabase
    .from("marketing_spotlights")
    .select("slug")
    .eq("id", id)
    .single();
  await supabase.from("marketing_spotlights").delete().eq("id", id);

  revalidatePath("/admin/content");
  revalidatePath("/marketing-solutions");
  revalidatePath("/marketing-solutions/spotlights");
  if (existing) revalidatePath(`/marketing-solutions/spotlights/${existing.slug}`);
  revalidatePath("/sitemap.xml");
  redirect("/admin/content");
}
