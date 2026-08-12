import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, buttonClass } from "@/components/ui";
import { MarketingPageView } from "@/components/Marketing";
import { PillarCard, ArticleCard, SpotlightCard, SubscribeForm } from "@/components/MarketingUI";
import { getAllIdeas, getAllSpotlights } from "@/lib/marketing-content";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Marketing Solutions — for businesses that hire | SHIFTED",
  description:
    "Practical growth ideas, real business stories, and trusted help — from operators who've done it. Built by SHIFTED.",
  alternates: { canonical: `${SITE_URL}/marketing-solutions` },
};

const MS = "/marketing-solutions";

export default async function MarketingHubPage() {
  const [ideas, spotlights] = await Promise.all([getAllIdeas(), getAllSpotlights()]);
  const latest = ideas.slice(0, 3);
  const featured = spotlights.find((s) => s.featured) ?? spotlights[0];

  return (
    <>
      <SiteHeader />
      <MarketingPageView page="hub" />
      <main>
        {/* Hero */}
        <section className="border-b border-stone-200">
          <Container className="py-16">
            <p className="eyebrow">Marketing Solutions</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-black leading-[1.05] tracking-tightest sm:text-5xl">
              Marketing solutions for businesses that hire.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-stone-600">
              Practical growth ideas, real business stories, and trusted help —
              from operators who&apos;ve done it. Built by SHIFTED.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`${MS}/ideas`} className={buttonClass("primary", "md")}>
                Read the ideas
              </Link>
              <Link href={`${MS}/solutions`} className={buttonClass("outline", "md")}>
                Get a marketing solution
              </Link>
            </div>
          </Container>
        </section>

        {/* Three pillars */}
        <Container className="py-14">
          <div className="grid gap-6 md:grid-cols-3">
            <PillarCard
              title="Ideas by SHIFTED"
              desc="Free, practical marketing playbooks for small teams — written by operators, not marketers."
              href={`${MS}/ideas`}
              cta="Read the ideas"
            />
            <PillarCard
              title="Business Spotlights"
              desc="Meet the cafés, bars and shops people actually want to work for. Real stories, real culture."
              href={`${MS}/spotlights`}
              cta="See the businesses"
            />
            <PillarCard
              title="Get a Solution"
              desc="Know what you need but not the time to do it? SHIFTED and our partners can help."
              href={`${MS}/solutions`}
              cta="See solutions"
            />
          </div>
        </Container>

        {/* Latest articles */}
        {latest.length > 0 && (
          <section className="border-t border-stone-200 bg-stone-50">
            <Container className="py-14">
              <div className="flex items-end justify-between gap-3">
                <h2 className="text-2xl font-bold tracking-tight">Latest ideas</h2>
                <Link href={`${MS}/ideas`} className="text-sm font-medium text-signal hover:underline">
                  All ideas →
                </Link>
              </div>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {latest.map((idea) => (
                  <ArticleCard key={idea.slug} idea={idea} />
                ))}
              </div>
            </Container>
          </section>
        )}

        {/* Featured spotlight */}
        {featured && (
          <Container className="py-14">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-2xl font-bold tracking-tight">Featured business</h2>
              <Link href={`${MS}/spotlights`} className="text-sm font-medium text-signal hover:underline">
                All spotlights →
              </Link>
            </div>
            <div className="mt-6 max-w-sm">
              <SpotlightCard spotlight={featured} />
            </div>
          </Container>
        )}

        {/* Community CTA band */}
        <section className="border-t border-stone-200 bg-ink text-paper">
          <Container className="py-14">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Run a business in hospitality, retail, or wellness?
                </h2>
                <p className="mt-2 text-stone-300">
                  Get featured, share what you&apos;ve learned, or find your next great hire.
                </p>
                <Link href={`${MS}/spotlights`} className={buttonClass("primary", "md") + " mt-5 inline-block"}>
                  Get featured →
                </Link>
              </div>
              <div className="rounded-[var(--radius-card)] bg-paper p-5 text-ink">
                <p className="text-sm font-medium">Get the ideas in your inbox</p>
                <p className="mt-1 text-xs text-stone-500">Occasional, practical, no spam.</p>
                <div className="mt-3">
                  <SubscribeForm returnTo={`${MS}`} />
                </div>
              </div>
            </div>
          </Container>
        </section>

        <Container className="py-10">
          <p className="text-center text-sm text-stone-400">
            People change. Businesses evolve. Careers move forward.
          </p>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
