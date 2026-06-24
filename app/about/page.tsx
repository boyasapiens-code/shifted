import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ButtonLink, Container } from "@/components/ui";

export const metadata: Metadata = { title: "How it works" };

const STEPS = [
  {
    n: "01",
    title: "Get vetted",
    body: "Employers verify their business, workplace, and salary standards. Candidates build honest, pre-screened profiles.",
  },
  {
    n: "02",
    title: "Match fast",
    body: "Search, filter, and apply in one click. Employers shortlist and schedule — no fake resumes, no ghost listings.",
  },
  {
    n: "03",
    title: "Build reputation",
    body: "Reliability and workplace reputation compound over time. Good people and good companies rise.",
  },
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Container className="py-20">
          <p className="eyebrow">How it works</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tightest sm:text-5xl">
            Hiring should feel like finding your next chapter.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-stone-600">
            SHIFTED is a curated marketplace — quality over quantity. We exist
            because hiring in Thailand&apos;s hospitality, retail, and lifestyle
            industries has been broken for too long.
          </p>

          <div className="mt-16 grid gap-10 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n}>
                <p className="text-3xl font-semibold tracking-tightest text-stone-300">
                  {s.n}
                </p>
                <h3 className="mt-3 text-lg font-semibold tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-2 text-stone-600">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 grid gap-8 border-t border-stone-200 pt-12 sm:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Help good people find good companies.
              </h2>
              <p className="mt-3 text-stone-600">
                Built by operators who&apos;ve run the cafés, bars, hotels and
                shops — not recruiters, not consultants.
              </p>
            </div>
            <div className="flex items-end">
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/jobs" size="lg">
                  Find work
                </ButtonLink>
                <ButtonLink href="/signup" size="lg" variant="outline">
                  Hire talent
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
