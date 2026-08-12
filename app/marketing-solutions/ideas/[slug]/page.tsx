import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, Badge } from "@/components/ui";
import { ShareButtons } from "@/components/Marketing";
import { ArticleCard, CtaBlock } from "@/components/MarketingUI";
import { getAllIdeas, loadIdea } from "@/lib/marketing-content";
import { SITE_URL } from "@/lib/site";

const MS = "/marketing-solutions";

export async function generateStaticParams() {
  const ideas = await getAllIdeas();
  return ideas.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = await loadIdea(slug);
  if (!a) return { title: "Ideas by SHIFTED" };
  return {
    title: a.seo.metaTitle ?? `${a.title} — SHIFTED`,
    description: a.seo.metaDescription ?? a.excerpt,
    openGraph: { title: a.title, description: a.excerpt, type: "article" },
    alternates: { canonical: `${SITE_URL}${MS}/ideas/${a.slug}` },
  };
}

export default async function IdeaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await loadIdea(slug);
  if (!article) notFound();

  const related = (await getAllIdeas())
    .filter((i) => i.slug !== article.slug && i.category === article.category)
    .slice(0, 3);
  const url = `${SITE_URL}${MS}/ideas/${article.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    author: { "@type": "Organization", name: article.author.name },
    publisher: { "@type": "Organization", name: "SHIFTED" },
    mainEntityOfPage: url,
  };

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <nav className="text-sm text-stone-500">
            <Link href={`${MS}/ideas`} className="hover:text-ink">Ideas</Link> ·{" "}
            <Link href={`${MS}/ideas?category=${encodeURIComponent(article.category)}`} className="hover:text-ink">
              {article.category}
            </Link>
          </nav>
          <div className="mt-4">
            <Badge>{article.category}</Badge>
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight">{article.title}</h1>
          <p className="mt-3 text-lg text-stone-600">{article.excerpt}</p>
          <p className="mt-4 text-sm text-stone-400">
            {article.author.name} · {article.author.role} · {article.readTime} min read
          </p>

          <article
            className="rights-prose mt-8"
            dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
          />

          <CtaBlock ctaType={article.ctaType} />

          <div className="mt-8 border-t border-stone-100 pt-5">
            <ShareButtons url={url} title={article.title} />
          </div>

          {related.length > 0 && (
            <div className="mt-12">
              <h2 className="text-lg font-semibold tracking-tight">Related ideas</h2>
              <div className="mt-4 grid gap-6 sm:grid-cols-3">
                {related.map((r) => (
                  <ArticleCard key={r.slug} idea={r} />
                ))}
              </div>
            </div>
          )}
        </Container>
      </main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
