import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container } from "@/components/ui";
import { RIGHTS_CATEGORIES, getAllRightsArticles } from "@/lib/rights";

export const metadata: Metadata = {
  title: "Know Your Rights — Thai workplace law in plain language",
  description:
    "Current Thai workplace law in plain language, for both employees and employers. Sourced, dated, two-sided answers to real questions.",
};

export default function RightsHubPage() {
  const articles = getAllRightsArticles();

  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden border-b border-stone-200">
          <div className="grid-texture pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
          <Container className="relative py-16">
            <p className="eyebrow">Know Your Rights</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight tracking-tightest sm:text-5xl">
              Thai workplace law, in plain language.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-stone-600">
              Current rules that shape work in Thailand — explained fairly for
              both sides, sourced, and dated. Not legal advice; a clear starting
              point.
            </p>
          </Container>
        </section>

        <Container className="py-12">
          <div className="grid gap-6 sm:grid-cols-2">
            {RIGHTS_CATEGORIES.map((cat) => {
              const list = articles.filter((a) => a.category === cat.id);
              return (
                <section
                  key={cat.id}
                  className="rounded-[var(--radius-card)] border border-stone-200 p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-semibold tracking-tight">
                      <Link href={`/rights/${cat.id}`} className="hover:underline">
                        {cat.name}
                      </Link>
                    </h2>
                    <span className="shrink-0 text-xs text-stone-400">
                      {list.length} {list.length === 1 ? "article" : "articles"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-stone-500">{cat.scope}</p>
                  {list.length > 0 ? (
                    <ul className="mt-4 space-y-2">
                      {list.map((a) => (
                        <li key={a.slug}>
                          <Link
                            href={`/rights/${cat.id}/${a.slug}`}
                            className="text-sm font-medium text-ink hover:underline"
                          >
                            {a.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-stone-400">Coming soon.</p>
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
