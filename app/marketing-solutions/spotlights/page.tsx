import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, cn } from "@/components/ui";
import { SpotlightCard, FeaturedForm } from "@/components/MarketingUI";
import { getAllSpotlights, SPOTLIGHT_CATEGORIES } from "@/lib/marketing-content";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Business Spotlights — businesses people want to work for | SHIFTED",
  description:
    "Curated profiles of cafés, bars, shops and venues worth working for. Real stories, real culture.",
  alternates: { canonical: `${SITE_URL}/marketing-solutions/spotlights` },
};

const MS = "/marketing-solutions";

export default async function SpotlightsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; submitted?: string }>;
}) {
  const { category, submitted } = await searchParams;
  let spotlights = await getAllSpotlights();
  if (category) spotlights = spotlights.filter((s) => s.category === category);

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="py-12">
          <p className="eyebrow">Business Spotlights</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Businesses people actually want to work for
          </h1>
          <p className="mt-1 max-w-xl text-stone-500">
            Every good business is built by people. These are the teams doing it
            well — and what it&apos;s like to work with them. Profiles are curated by SHIFTED.
          </p>

          {/* Category filter */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link
              href={`${MS}/spotlights`}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                !category ? "bg-ink text-paper" : "border border-stone-200 text-stone-600 hover:text-ink",
              )}
            >
              All
            </Link>
            {SPOTLIGHT_CATEGORIES.map((c) => (
              <Link
                key={c.value}
                href={`${MS}/spotlights?category=${c.value}`}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  category === c.value ? "bg-ink text-paper" : "border border-stone-200 text-stone-600 hover:text-ink",
                )}
              >
                {c.label}
              </Link>
            ))}
          </div>

          {spotlights.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {spotlights.map((s) => (
                <SpotlightCard key={s.slug} spotlight={s} />
              ))}
            </div>
          ) : (
            <p className="mt-8 rounded-[var(--radius-card)] border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
              No spotlights in this category yet.
            </p>
          )}

          {/* Get featured */}
          <div id="featured" className="mt-14 scroll-mt-20 rounded-[var(--radius-card)] border border-stone-200 p-6">
            <h2 className="text-xl font-semibold tracking-tight">Want your business featured?</h2>
            <p className="mt-1 text-sm text-stone-500">
              Tell us about your team and culture. We curate spotlights editorially —
              we&apos;ll be in touch if it&apos;s a fit.
            </p>
            {submitted === "featured" ? (
              <p className="mt-4 rounded-[var(--radius-base)] bg-stone-100 px-3 py-2 text-sm text-ink">
                Thanks — we&apos;ve got it. We&apos;ll reach out if your business is a fit.
              </p>
            ) : (
              <div className="mt-4">
                <FeaturedForm />
              </div>
            )}
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
