import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, cn } from "@/components/ui";
import { ArticleCard, SubscribeForm } from "@/components/MarketingUI";
import { getAllIdeas, IDEA_CATEGORIES } from "@/lib/marketing-content";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Ideas by SHIFTED — practical marketing playbooks",
  description:
    "Free, practical growth and marketing playbooks for small hospitality, retail and wellness teams. Written by operators.",
  alternates: { canonical: `${SITE_URL}/marketing-solutions/ideas` },
};

const MS = "/marketing-solutions";

export default async function IdeasIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  let ideas = await getAllIdeas();
  if (category) ideas = ideas.filter((i) => i.category === category);
  if (q) {
    const t = q.toLowerCase();
    ideas = ideas.filter((i) => `${i.title} ${i.excerpt}`.toLowerCase().includes(t));
  }
  const featured = !category && !q ? ideas.find((i) => i.featured) : undefined;
  const rest = featured ? ideas.filter((i) => i.slug !== featured.slug) : ideas;

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="py-12">
          <p className="eyebrow">Ideas by SHIFTED</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Practical playbooks for small teams
          </h1>
          <p className="mt-1 max-w-xl text-stone-500">
            Hiring, visibility, and keeping good people — written by operators, not marketers.
          </p>

          {/* Category filter + search */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link
              href={`${MS}/ideas`}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                !category ? "bg-ink text-paper" : "border border-stone-200 text-stone-600 hover:text-ink",
              )}
            >
              All
            </Link>
            {IDEA_CATEGORIES.map((c) => (
              <Link
                key={c}
                href={`${MS}/ideas?category=${encodeURIComponent(c)}`}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  category === c ? "bg-ink text-paper" : "border border-stone-200 text-stone-600 hover:text-ink",
                )}
              >
                {c}
              </Link>
            ))}
          </div>
          <form method="get" className="mt-3 max-w-md">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search ideas…"
              className="w-full rounded-[var(--radius-base)] border border-stone-200 px-3 py-2 text-sm"
            />
          </form>

          {/* Featured */}
          {featured && (
            <div className="mt-8 grid gap-6 rounded-[var(--radius-card)] border border-stone-200 bg-stone-50 p-6 sm:grid-cols-[2fr,3fr] sm:items-center">
              <div className="flex aspect-[16/9] items-center justify-center rounded-[var(--radius-base)] bg-stone-100">
                <span className="text-xs uppercase tracking-widest text-stone-400">{featured.category}</span>
              </div>
              <div>
                <p className="eyebrow">Featured</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  <Link href={`${MS}/ideas/${featured.slug}`} className="hover:underline">
                    {featured.title}
                  </Link>
                </h2>
                <p className="mt-2 text-sm text-stone-600">{featured.excerpt}</p>
                <p className="mt-3 text-xs text-stone-400">
                  {featured.author.name} · {featured.readTime} min read
                </p>
              </div>
            </div>
          )}

          {/* Grid */}
          {rest.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((idea) => (
                <ArticleCard key={idea.slug} idea={idea} />
              ))}
            </div>
          ) : (
            <p className="mt-8 rounded-[var(--radius-card)] border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
              No articles match. Try another category.
            </p>
          )}

          {/* Subscribe CTA */}
          <div className="mt-14 rounded-[var(--radius-card)] border border-stone-200 p-6">
            <p className="font-medium text-ink">Get new ideas in your inbox</p>
            <p className="mt-1 text-sm text-stone-500">
              Practical and occasional. Or, want it done for you?{" "}
              <Link href={`${MS}/solutions`} className="text-signal hover:underline">See solutions →</Link>
            </p>
            <div className="mt-3 max-w-md">
              <SubscribeForm returnTo={`${MS}/ideas`} />
            </div>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
