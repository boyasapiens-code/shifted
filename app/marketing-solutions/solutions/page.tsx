import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, buttonClass } from "@/components/ui";
import { MarketingPageView, OutboundLink } from "@/components/Marketing";
import { EnquiryForm } from "@/components/MarketingUI";
import { PARTNERS, partnerUrl, SHIFTED_SOLUTION } from "@/lib/marketing";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Get a Solution — SHIFTED & partners",
  description:
    "SHIFTED helps you hire. Our partners help you grow. Hiring & employer branding, plus trusted local-visibility help via Booyah.",
  alternates: { canonical: `${SITE_URL}/marketing-solutions/solutions` },
};

export default async function SolutionsPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; error?: string }>;
}) {
  const { submitted, error } = await searchParams;
  const partners = [...PARTNERS].sort((a, b) => a.order - b.order);

  return (
    <>
      <SiteHeader />
      <MarketingPageView page="solutions" />
      <main>
        <Container className="max-w-3xl py-12">
          <p className="eyebrow">Get a Solution · Powered by SHIFTED &amp; partners</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            SHIFTED helps you hire. Our partners help you grow.
          </h1>
          <p className="mt-2 max-w-xl text-stone-600">
            Here&apos;s how. No hard sell — just the things we and people we trust
            can take off your plate.
          </p>

          {/* Solution cards */}
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {/* Shifted core */}
            <div className="flex flex-col rounded-[var(--radius-card)] border border-stone-200 p-6">
              <p className="eyebrow">SHIFTED</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">{SHIFTED_SOLUTION.title}</h2>
              <p className="mt-2 flex-1 text-sm text-stone-600">{SHIFTED_SOLUTION.description}</p>
              <Link href={SHIFTED_SOLUTION.href} className={buttonClass("primary", "sm") + " mt-4 self-start"}>
                {SHIFTED_SOLUTION.ctaLabel}
              </Link>
            </div>

            {/* Partners (outbound only) */}
            {partners.map((p) => (
              <div key={p.slug} className="flex flex-col rounded-[var(--radius-card)] border border-stone-200 p-6">
                <p className="eyebrow">Partner</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">{p.tagline} — {p.name}</h2>
                <p className="mt-2 flex-1 text-sm text-stone-600">{p.description}</p>
                <p className="mt-2 text-xs text-stone-400">{p.trustLine}</p>
                <OutboundLink href={partnerUrl(p)} label={p.slug} variant="outline" size="sm" className="mt-4 self-start">
                  {p.ctaLabel}
                </OutboundLink>
              </div>
            ))}
          </div>

          {/* Why trust this */}
          <div className="mt-10 rounded-[var(--radius-card)] bg-stone-50 p-6">
            <h2 className="text-lg font-semibold tracking-tight">Why trust this</h2>
            <p className="mt-2 text-sm text-stone-600">
              We&apos;re operators first. SHIFTED was built by people who actually
              hire, train, and run venues — and our partners are people we&apos;ve
              worked with and would use ourselves. We only point you to help we&apos;d
              take ourselves. If something isn&apos;t a fit, we&apos;ll say so.
            </p>
          </div>

          {/* Enquiry */}
          <div className="mt-10 rounded-[var(--radius-card)] border border-stone-200 p-6">
            <h2 className="text-lg font-semibold tracking-tight">Not sure where to start?</h2>
            <p className="mt-1 text-sm text-stone-500">
              Tell us what you need and we&apos;ll point you the right way.
            </p>
            {error === "busy" && (
              <p className="mt-3 rounded-[var(--radius-base)] bg-danger/10 px-3 py-2 text-sm text-danger">
                Too many submissions — please try again shortly.
              </p>
            )}
            {submitted === "enquiry" ? (
              <p className="mt-4 rounded-[var(--radius-base)] bg-stone-100 px-3 py-2 text-sm text-ink">
                Thanks — we&apos;ll be in touch.
              </p>
            ) : (
              <div className="mt-4">
                <EnquiryForm />
              </div>
            )}
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
