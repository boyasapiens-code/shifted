import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container } from "@/components/ui";
import { RightsLangToggle } from "@/components/Rights";
import {
  RIGHTS_CATEGORIES,
  RIGHTS_COPY,
  categoryLabel,
  getAllRightsArticles,
  toRightsLang,
} from "@/lib/rights";
import { SITE_URL } from "@/lib/site";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const lang = toRightsLang((await searchParams).lang);
  const t = RIGHTS_COPY[lang];
  return {
    title:
      lang === "th"
        ? "รู้สิทธิ์ของคุณ — กฎหมายแรงงานไทย ฉบับเข้าใจง่าย"
        : "Know Your Rights — Thai workplace law in plain language",
    description: t.hubLede,
    alternates: {
      canonical: lang === "th" ? `${SITE_URL}/rights?lang=th` : `${SITE_URL}/rights`,
      languages: {
        en: `${SITE_URL}/rights`,
        th: `${SITE_URL}/rights?lang=th`,
        "x-default": `${SITE_URL}/rights`,
      },
    },
  };
}

export default async function RightsHubPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const lang = toRightsLang((await searchParams).lang);
  const t = RIGHTS_COPY[lang];
  const articles = getAllRightsArticles(lang);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden border-b border-stone-200">
          <div className="grid-texture pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
          <Container className="relative py-16">
            <div className="flex items-center justify-between gap-4">
              <p className="eyebrow">{t.eyebrow}</p>
              <RightsLangToggle path="/rights" lang={lang} />
            </div>
            <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight tracking-tightest sm:text-5xl">
              {t.hubTitle}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-stone-600">{t.hubLede}</p>
          </Container>
        </section>

        <Container className="py-12">
          <div className="grid gap-6 sm:grid-cols-2">
            {RIGHTS_CATEGORIES.map((cat) => {
              const list = articles.filter((a) => a.category === cat.id);
              const label = categoryLabel(cat, lang);
              const qs = lang === "th" ? "?lang=th" : "";
              return (
                <section
                  key={cat.id}
                  className="rounded-[var(--radius-card)] border border-stone-200 p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-semibold tracking-tight">
                      <Link href={`/rights/${cat.id}${qs}`} className="hover:underline">
                        {label.name}
                      </Link>
                    </h2>
                    <span className="shrink-0 text-xs text-stone-400">
                      {t.articles(list.length)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-stone-500">{label.scope}</p>
                  {list.length > 0 ? (
                    <ul className="mt-4 space-y-2">
                      {list.map((a) => (
                        <li key={a.slug}>
                          <Link
                            href={`/rights/${cat.id}/${a.slug}${qs}`}
                            className="text-sm font-medium text-ink hover:underline"
                          >
                            {a.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-stone-400">{t.comingSoon}</p>
                  )}
                </section>
              );
            })}
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
