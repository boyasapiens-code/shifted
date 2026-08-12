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
  RightsLangToggle,
} from "@/components/Rights";
import {
  RIGHTS_COPY,
  getAllRightsArticles,
  getRightsArticle,
  getRightsCategory,
  categoryLabel,
  toRightsLang,
} from "@/lib/rights";
import { SITE_URL } from "@/lib/site";

export async function generateStaticParams() {
  const articles = await getAllRightsArticles();
  return articles.map((a) => ({ category: a.category, slug: a.slug }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  const lang = toRightsLang((await searchParams).lang);
  const a = await getRightsArticle(slug, lang);
  if (!a) return { title: RIGHTS_COPY[lang].eyebrow };
  const base = `${SITE_URL}/rights/${category}/${slug}`;
  return {
    title: a.title,
    description: a.summary,
    openGraph: { title: a.title, description: a.summary, type: "article" },
    alternates: {
      canonical: lang === "th" ? `${base}?lang=th` : base,
      languages: {
        en: base,
        ...(a.langs.includes("th") ? { th: `${base}?lang=th` } : {}),
        "x-default": base,
      },
    },
  };
}

export default async function RightsArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { category, slug } = await params;
  const lang = toRightsLang((await searchParams).lang);
  const t = RIGHTS_COPY[lang];
  const article = await getRightsArticle(slug, lang);
  if (!article || article.category !== category) notFound();

  const cat = getRightsCategory(category);
  const catLabel = cat ? categoryLabel(cat, lang) : null;
  const qs = lang === "th" ? "?lang=th" : "";
  const related = (
    await Promise.all(article.related.map((s) => getRightsArticle(s, lang)))
  ).filter((a): a is NonNullable<typeof a> => !!a);

  // JSON-LD: Article (uses the actual rendered language).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.summary,
    inLanguage: article.lang,
    dateModified: article.last_reviewed,
    publisher: { "@type": "Organization", name: "SHIFTED" },
    mainEntityOfPage: `${SITE_URL}/rights/${category}/${slug}${qs}`,
  };

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <div className="flex items-center justify-between gap-4">
            <nav className="text-sm text-stone-500">
              <Link href={`/rights${qs}`} className="hover:text-ink">
                {t.eyebrow}
              </Link>{" "}
              ·{" "}
              <Link href={`/rights/${category}${qs}`} className="hover:text-ink">
                {catLabel?.name}
              </Link>
            </nav>
            {article.langs.includes("th") && (
              <RightsLangToggle path={`/rights/${category}/${slug}`} lang={lang} />
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge>{t.audience[article.audience]}</Badge>
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight">
            {article.title}
          </h1>
          <p className="mt-3 text-lg text-stone-600">{article.summary}</p>
          <div className="mt-3">
            <LastReviewed article={article} lang={lang} />
          </div>

          {/* The quick version */}
          <div className="mt-8 rounded-[var(--radius-card)] border-l-2 border-ink bg-stone-50 p-5">
            <p className="eyebrow mb-1">{t.sectionQuick}</p>
            <RightsProse md={article.sections.quick} />
          </div>

          {/* What the law says */}
          <section className="mt-8">
            <h2 className="text-lg font-semibold tracking-tight">{t.sectionLaw}</h2>
            <RightsProse md={article.sections.law} className="mt-2" />
          </section>

          {/* Both sides */}
          <section className="mt-8">
            <h2 className="text-lg font-semibold tracking-tight">{t.sectionBoth}</h2>
            <BothSides
              employees={article.sections.employees}
              employers={article.sections.employers}
              lang={lang}
            />
          </section>

          {/* Myths & gray areas */}
          <section className="mt-8">
            <h2 className="text-lg font-semibold tracking-tight">{t.sectionMyths}</h2>
            <RightsProse md={article.sections.myths} className="mt-2" />
          </section>

          {/* What good looks like */}
          <section className="mt-8 rounded-[var(--radius-card)] bg-ink p-5 text-paper">
            <p className="eyebrow mb-1 text-stone-400">{t.sectionGood}</p>
            <RightsProse
              md={article.sections.good}
              className="text-stone-200 [&_strong]:text-paper [&_a]:text-paper"
            />
          </section>

          <SourceList sources={article.sources} lang={lang} />
          <RightsDisclaimer lang={lang} />

          {/* Related + CTA */}
          {related.length > 0 && (
            <div className="mt-10">
              <p className="eyebrow mb-3">{t.related}</p>
              <ul className="space-y-2">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/rights/${r.category}/${r.slug}${qs}`}
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
              <p className="font-medium text-ink">{t.ctaTitle}</p>
              <p className="mt-1 text-sm text-stone-600">{t.ctaBody}</p>
            </div>
            <div className="flex items-center gap-2">
              <ButtonLink href="/jobs" size="sm">
                {t.findWork}
              </ButtonLink>
              <ButtonLink href="/signup" size="sm" variant="outline">
                {t.hireTalent}
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
