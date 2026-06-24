import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container } from "@/components/ui";
import {
  RIGHTS_CATEGORIES,
  getRightsCategory,
  getAllRightsArticles,
} from "@/lib/rights";

export function generateStaticParams() {
  return RIGHTS_CATEGORIES.map((c) => ({ category: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const cat = getRightsCategory(category);
  return {
    title: cat ? `${cat.name} — Know Your Rights` : "Know Your Rights",
    description: cat?.scope,
  };
}

export default async function RightsCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = getRightsCategory(category);
  if (!cat) notFound();

  const articles = getAllRightsArticles().filter((a) => a.category === category);

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-3xl py-12">
          <Link href="/rights" className="text-sm text-stone-500 hover:text-ink">
            ← Know Your Rights
          </Link>
          <p className="eyebrow mt-3">Category</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{cat.name}</h1>
          <p className="mt-1 text-stone-500">{cat.scope}</p>

          {articles.length > 0 ? (
            <div className="mt-8 space-y-3">
              {articles.map((a) => (
                <Link
                  key={a.slug}
                  href={`/rights/${category}/${a.slug}`}
                  className="card-interactive block rounded-[var(--radius-card)] border border-stone-200 p-5"
                >
                  <h2 className="font-semibold tracking-tight text-ink">{a.title}</h2>
                  <p className="mt-1 text-sm text-stone-600">{a.summary}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-8 rounded-[var(--radius-card)] border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
              Articles for this category are coming soon.
            </p>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
