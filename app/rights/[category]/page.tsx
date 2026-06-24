import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container } from "@/components/ui";
import { RightsLangToggle } from "@/components/Rights";
import {
  RIGHTS_CATEGORIES,
  RIGHTS_COPY,
  categoryLabel,
  getRightsCategory,
  getAllRightsArticles,
  toRightsLang,
} from "@/lib/rights";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return RIGHTS_CATEGORIES.map((c) => ({ category: c.id }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const lang = toRightsLang((await searchParams).lang);
  const cat = getRightsCategory(category);
  if (!cat) return { title: RIGHTS_COPY[lang].eyebrow };
  const label = categoryLabel(cat, lang);
  return {
    title: `${label.name} — ${RIGHTS_COPY[lang].eyebrow}`,
    description: label.scope,
    alternates: {
      canonical:
        lang === "th"
          ? `${SITE_URL}/rights/${category}?lang=th`
          : `${SITE_URL}/rights/${category}`,
      languages: {
        en: `${SITE_URL}/rights/${category}`,
        th: `${SITE_URL}/rights/${category}?lang=th`,
        "x-default": `${SITE_URL}/rights/${category}`,
      },
    },
  };
}

export default async function RightsCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { category } = await params;
  const lang = toRightsLang((await searchParams).lang);
  const t = RIGHTS_COPY[lang];
  const cat = getRightsCategory(category);
  if (!cat) notFound();

  const label = categoryLabel(cat, lang);
  const qs = lang === "th" ? "?lang=th" : "";
  const articles = getAllRightsArticles(lang).filter((a) => a.category === category);

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-3xl py-12">
          <div className="flex items-center justify-between gap-4">
            <Link href={`/rights${qs}`} className="text-sm text-stone-500 hover:text-ink">
              {t.backToHub}
            </Link>
            <RightsLangToggle path={`/rights/${category}`} lang={lang} />
          </div>
          <p className="eyebrow mt-3">{t.category}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{label.name}</h1>
          <p className="mt-1 text-stone-500">{label.scope}</p>

          {articles.length > 0 ? (
            <div className="mt-8 space-y-3">
              {articles.map((a) => (
                <Link
                  key={a.slug}
                  href={`/rights/${category}/${a.slug}${qs}`}
                  className="card-interactive block rounded-[var(--radius-card)] border border-stone-200 p-5"
                >
                  <h2 className="font-semibold tracking-tight text-ink">{a.title}</h2>
                  <p className="mt-1 text-sm text-stone-600">{a.summary}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-8 rounded-[var(--radius-card)] border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
              {t.comingSoon}
            </p>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
