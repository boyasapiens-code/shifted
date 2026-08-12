import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, cn } from "@/components/ui";
import { RightsLangToggle } from "@/components/Rights";
import {
  RIGHTS_CATEGORIES,
  RIGHTS_COPY,
  categoryLabel,
  getAllRightsArticles,
  getRightsCategory,
  readMinutes,
  toRightsLang,
  type RightsLang,
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

type Audience = "all" | "employee" | "employer";

/** Build a hub URL preserving the other filters + language. */
function hubHref(lang: RightsLang, audience: Audience, category: string): string {
  const q = new URLSearchParams();
  if (lang === "th") q.set("lang", "th");
  if (audience !== "all") q.set("audience", audience);
  if (category) q.set("category", category);
  const s = q.toString();
  return s ? `/rights?${s}` : "/rights";
}

const pill = (active: boolean) =>
  cn(
    "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
    active
      ? "border-ink bg-ink text-paper"
      : "border-stone-200 text-stone-600 hover:border-stone-300 hover:text-ink",
  );

export default async function RightsHubPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; audience?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const lang = toRightsLang(sp.lang);
  const audience: Audience =
    sp.audience === "employee" || sp.audience === "employer" ? sp.audience : "all";
  const category = sp.category && getRightsCategory(sp.category) ? sp.category : "";
  const t = RIGHTS_COPY[lang];

  // Newest first — it's a publication, not a directory.
  const all = (await getAllRightsArticles(lang)).sort((a, b) =>
    b.last_reviewed.localeCompare(a.last_reviewed),
  );

  // "Both sides" articles stay visible in either audience view — the whole
  // point is holding employer and employee together, not splitting them.
  let articles = all;
  if (audience === "employee") articles = articles.filter((a) => a.audience !== "employer");
  if (audience === "employer") articles = articles.filter((a) => a.audience !== "employee");
  if (category) articles = articles.filter((a) => a.category === category);

  const topics = RIGHTS_CATEGORIES.filter((c) => all.some((a) => a.category === c.id));

  const AUDIENCES: { key: Audience; label: string }[] = [
    { key: "all", label: t.filterAll },
    { key: "employee", label: t.audience.employee },
    { key: "employer", label: t.audience.employer },
  ];

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

            {/* One publication, both sides — the editorial promise up front. */}
            <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
              <div className="rounded-[var(--radius-card)] border border-stone-200 bg-paper/70 p-4">
                <p className="eyebrow mb-1">{t.forEmployees}</p>
                <p className="text-sm text-stone-600">{t.workersNote}</p>
              </div>
              <div className="rounded-[var(--radius-card)] border border-stone-200 bg-paper/70 p-4">
                <p className="eyebrow mb-1">{t.forEmployers}</p>
                <p className="text-sm text-stone-600">{t.employersNote}</p>
              </div>
            </div>
          </Container>
        </section>

        <Container className="py-12">
          {/* Filters — audience first (who you are), then topic. Plain links. */}
          <div className="flex flex-wrap items-center gap-2">
            {AUDIENCES.map((a) => (
              <Link
                key={a.key}
                href={hubHref(lang, a.key, category)}
                className={pill(audience === a.key)}
              >
                {a.label}
              </Link>
            ))}
          </div>
          {topics.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link href={hubHref(lang, audience, "")} className={pill(!category)}>
                {t.allTopics}
              </Link>
              {topics.map((c) => (
                <Link
                  key={c.id}
                  href={hubHref(lang, audience, c.id)}
                  className={pill(category === c.id)}
                >
                  {categoryLabel(c, lang).name}
                </Link>
              ))}
            </div>
          )}

          {/* The feed */}
          {articles.length > 0 ? (
            <div className="mt-8 space-y-4">
              {articles.map((a) => {
                const cat = getRightsCategory(a.category);
                const qs = lang === "th" ? "?lang=th" : "";
                return (
                  <Link
                    key={a.slug}
                    href={`/rights/${a.category}/${a.slug}${qs}`}
                    className="card-interactive block rounded-[var(--radius-card)] border border-stone-200 p-6"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 font-medium",
                          a.audience === "both"
                            ? "bg-signal/10 text-signal"
                            : "bg-stone-100 text-stone-600",
                        )}
                      >
                        {t.audience[a.audience]}
                      </span>
                      {cat && (
                        <span className="text-stone-400">
                          {categoryLabel(cat, lang).name}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">
                      {a.title}
                    </h2>
                    <p className="mt-1.5 text-stone-600">{a.summary}</p>
                    <p className="mt-3 text-xs text-stone-400">
                      {new Date(a.last_reviewed).toLocaleDateString(t.dateLocale, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {" · "}
                      {t.minRead(readMinutes(a))}
                    </p>
                  </Link>
                );
              })}
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
