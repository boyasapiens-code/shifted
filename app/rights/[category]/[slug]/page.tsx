import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, ButtonLink, Badge } from "@/components/ui";
import {
  RightsProse,
  BothSides,
  LastReviewed,
  RightsDisclaimer,
  SourceList,
} from "@/components/Rights";
import {
  getAllRightsArticles,
  getRightsArticle,
  getRightsCategory,
} from "@/lib/rights";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return getAllRightsArticles().map((a) => ({ category: a.category, slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = getRightsArticle(slug);
  if (!a) return { title: "Know Your Rights" };
  return {
    title: a.title,
    description: a.summary,
    openGraph: { title: a.title, description: a.summary, type: "article" },
    alternates: { canonical: `${SITE_URL}/rights/${a.category}/${a.slug}` },
  };
}

const AUDIENCE_LABEL: Record<string, string> = {
  both: "For both sides",
  employee: "For employees",
  employer: "For employers",
};

export default async function RightsArticlePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const article = getRightsArticle(slug);
  if (!article || article.category !== category) notFound();

  const cat = getRightsCategory(category);
  const related = article.related
    .map((s) => getRightsArticle(s))
    .filter((a): a is NonNullable<typeof a> => !!a);

  // JSON-LD: Article + FAQ-style + breadcrumb.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.summary,
    inLanguage: article.lang,
    dateModified: article.last_reviewed,
    publisher: { "@type": "Organization", name: "SHIFTED" },
    mainEntityOfPage: `${SITE_URL}/rights/${category}/${slug}`,
  };

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <nav className="text-sm text-stone-500">
            <Link href="/rights" className="hover:text-ink">
              Know Your Rights
            </Link>{" "}
            ·{" "}
            <Link href={`/rights/${category}`} className="hover:text-ink">
              {cat?.name}
            </Link>
          </nav>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge>{AUDIENCE_LABEL[article.audience] ?? "For both sides"}</Badge>
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight">
            {article.title}
          </h1>
          <p className="mt-3 text-lg text-stone-600">{article.summary}</p>
          <div className="mt-3">
            <LastReviewed article={article} />
          </div>

          {/* The quick version */}
          <div className="mt-8 rounded-[var(--radius-card)] border-l-2 border-ink bg-stone-50 p-5">
            <p className="eyebrow mb-1">The quick version</p>
            <RightsProse md={article.sections.quick} />
          </div>

          {/* What the law says */}
          <section className="mt-8">
            <h2 className="text-lg font-semibold tracking-tight">What the law says</h2>
            <RightsProse md={article.sections.law} className="mt-2" />
          </section>

          {/* Both sides */}
          <section className="mt-8">
            <h2 className="text-lg font-semibold tracking-tight">Both sides</h2>
            <BothSides
              employees={article.sections.employees}
              employers={article.sections.employers}
            />
          </section>

          {/* Myths & gray areas */}
          <section className="mt-8">
            <h2 className="text-lg font-semibold tracking-tight">Myths &amp; gray areas</h2>
            <RightsProse md={article.sections.myths} className="mt-2" />
          </section>

          {/* What good looks like */}
          <section className="mt-8 rounded-[var(--radius-card)] bg-ink p-5 text-paper">
            <p className="eyebrow mb-1 text-stone-400">What good looks like</p>
            <RightsProse md={article.sections.good} className="text-stone-200 [&_strong]:text-paper [&_a]:text-paper" />
          </section>

          <SourceList sources={article.sources} />
          <RightsDisclaimer />

          {/* Related + CTA */}
          {related.length > 0 && (
            <div className="mt-10">
              <p className="eyebrow mb-3">Related</p>
              <ul className="space-y-2">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/rights/${r.category}/${r.slug}`}
                      className="text-sm font-medium text-ink hover:underline"
                    >
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-10 flex flex-wrap gap-3 rounded-[var(--radius-card)] border border-stone-200 p-6">
            <div className="flex-1">
              <p className="font-medium text-ink">Know your rights, then make your move.</p>
              <p className="mt-1 text-sm text-stone-600">
                SHIFTED connects verified employers with pre-screened workers — fairly, both sides.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ButtonLink href="/jobs" size="sm">
                Find work
              </ButtonLink>
              <ButtonLink href="/signup" size="sm" variant="outline">
                Hire talent
              </ButtonLink>
            </div>
          </div>
        </Container>
      </main>
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
