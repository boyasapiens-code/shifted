import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, Badge, buttonClass } from "@/components/ui";
import { OutboundLink, ShareButtons } from "@/components/Marketing";
import { getAllSpotlights, loadSpotlight, SPOTLIGHT_CATEGORIES } from "@/lib/marketing-content";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";

const MS = "/marketing-solutions";
const catLabel = (v: string) => SPOTLIGHT_CATEGORIES.find((c) => c.value === v)?.label ?? v;

export function generateStaticParams() {
  return getAllSpotlights().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = loadSpotlight(slug);
  if (!s) return { title: "Business Spotlights" };
  return {
    title: s.seo.metaTitle ?? `${s.businessName} — Spotlight | SHIFTED`,
    description: s.seo.metaDescription ?? `${s.businessName} — ${catLabel(s.category)} in ${s.area}.`,
    alternates: { canonical: `${SITE_URL}${MS}/spotlights/${s.slug}` },
  };
}

export default async function SpotlightPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = loadSpotlight(slug);
  if (!s) notFound();

  // "They're hiring" — live roles, if this business is linked to a SHIFTED employer.
  let jobs: { id: string; title: string }[] = [];
  if (s.shiftedEmployerId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("jobs")
      .select("id, title")
      .eq("employer_id", s.shiftedEmployerId)
      .eq("status", "published")
      .limit(5);
    jobs = data ?? [];
  }

  const url = `${SITE_URL}${MS}/spotlights/${s.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: s.businessName,
    address: s.area,
    url: s.website ?? url,
    ...(s.foundedYear ? { foundingDate: String(s.foundedYear) } : {}),
  };

  return (
    <>
      <SiteHeader />
      <main>
        {/* Header */}
        <section className="border-b border-stone-200 bg-ink text-paper">
          <Container className="py-14">
            <Link href={`${MS}/spotlights`} className="text-sm text-stone-300 hover:text-paper">
              ← Business Spotlights
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-stone-300">
              <Badge>{catLabel(s.category)}</Badge>
              {s.area && <span>{s.area}</span>}
              {s.foundedYear && <span>· Founded {s.foundedYear}</span>}
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-tightest">{s.businessName}</h1>
          </Container>
        </section>

        <Container className="max-w-2xl py-12">
          {s.sections.story && (
            <section>
              <h2 className="text-xl font-semibold tracking-tight">The story</h2>
              <div className="rights-prose mt-2" dangerouslySetInnerHTML={{ __html: s.sections.story }} />
            </section>
          )}
          {s.sections.culture && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold tracking-tight">The culture</h2>
              <div className="rights-prose mt-2" dangerouslySetInnerHTML={{ __html: s.sections.culture }} />
            </section>
          )}
          {s.sections.knownFor && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold tracking-tight">What they&apos;re known for</h2>
              <div className="rights-prose mt-2" dangerouslySetInnerHTML={{ __html: s.sections.knownFor }} />
            </section>
          )}

          {/* They're hiring */}
          <div className="mt-10 rounded-[var(--radius-card)] border border-stone-200 bg-stone-50 p-6">
            <h2 className="text-lg font-semibold tracking-tight">They&apos;re hiring</h2>
            {jobs.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {jobs.map((j) => (
                  <li key={j.id}>
                    <Link href={`/jobs/${j.id}`} className="text-sm font-medium text-ink hover:underline">
                      {j.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-stone-600">
                See open roles from vetted employers on{" "}
                <Link href="/jobs" className="text-signal hover:underline">SHIFTED jobs →</Link>
              </p>
            )}
          </div>

          {/* Links */}
          {(s.website || s.socials.length > 0) && (
            <div className="mt-8 flex flex-wrap gap-2">
              {s.website && (
                <OutboundLink href={s.website} label={`spotlight:${s.slug}:website`} variant="outline" size="sm">
                  Visit website →
                </OutboundLink>
              )}
              {s.socials.map((soc) => (
                <OutboundLink
                  key={soc.url}
                  href={soc.url}
                  label={`spotlight:${s.slug}:${soc.label}`}
                  className={buttonClass("outline", "sm")}
                >
                  {soc.label} →
                </OutboundLink>
              ))}
            </div>
          )}

          <p className="mt-8 text-xs text-stone-400">Profiles are curated by SHIFTED.</p>

          <div className="mt-6 border-t border-stone-100 pt-5">
            <ShareButtons url={url} title={s.businessName} />
          </div>
        </Container>
      </main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
