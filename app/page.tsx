import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { JobCard } from "@/components/JobCard";
import { ButtonLink, Container } from "@/components/ui";
import { getPublishedJobs } from "@/lib/queries";
import { INDUSTRIES } from "@/lib/constants";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; next?: string }>;
}) {
  // Safety net: if an auth code lands on the homepage (Supabase falling back to
  // the Site URL instead of /auth/callback), forward it to the callback.
  const { code, next } = await searchParams;
  if (code) {
    const params = new URLSearchParams({ code });
    if (next) params.set("next", next);
    redirect(`/auth/callback?${params.toString()}`);
  }

  const featured = await getPublishedJobs({ limit: 6 });

  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <Container className="py-20 sm:py-28">
          <p className="eyebrow">The right shift can change everything</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-black leading-[1.02] tracking-tightest sm:text-6xl">
            Better jobs.
            <br />
            Better people.
            <br />
            Better workplaces.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-stone-600">
            SHIFTED is the vetted talent network for Hospitality, Retail &amp;
            Lifestyle. We connect great people with great companies — so everyone
            can move forward.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/jobs" size="lg">
              Find a Job
            </ButtonLink>
            <ButtonLink href="/signup" size="lg" variant="outline">
              Hire Talent
            </ButtonLink>
          </div>

          {/* Industry pills */}
          <div className="mt-12 flex flex-wrap gap-2">
            {INDUSTRIES.filter((i) => i.value !== "other").map((i) => (
              <Link
                key={i.value}
                href={`/jobs?industry=${i.value}`}
                className="rounded-full border border-stone-200 px-3.5 py-1.5 text-sm text-stone-600 transition-colors hover:border-ink hover:text-ink"
              >
                {i.label}
              </Link>
            ))}
          </div>
        </Container>

        {/* Brand pillars */}
        <section className="border-y border-stone-200 bg-stone-50">
          <Container className="grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
            <ValueProp
              kicker="People First"
              title="We put people before process"
              body="Pre-screened candidates and verified employers. No fake resumes, no ghost listings."
            />
            <ValueProp
              kicker="Built on Trust"
              title="Trust is our foundation"
              body="Clear salaries, real workplace photos, and reputation that compounds over time."
            />
            <ValueProp
              kicker="Move Forward"
              title="We create opportunities"
              body="One-click apply, fast matching, and a hiring process that doesn't feel broken."
            />
            <ValueProp
              kicker="Stronger Together"
              title="Better teams. Better workplaces."
              body="Good people and good companies, raising the standard for the whole industry."
            />
          </Container>
        </section>

        {/* Featured jobs */}
        <Container className="py-16">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="eyebrow">Now hiring</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                Featured roles
              </h2>
            </div>
            <Link href="/jobs" className="text-sm font-medium text-ink underline">
              View all
            </Link>
          </div>

          {featured.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <div className="rounded-[var(--radius-base)] border border-dashed border-stone-300 p-10 text-center text-stone-500">
              <p className="font-medium text-ink">No live roles yet.</p>
              <p className="mt-1 text-sm">
                Once employers publish jobs, they&apos;ll appear here. Be the
                first —{" "}
                <Link href="/signup" className="underline">
                  post a job
                </Link>
                .
              </p>
            </div>
          )}
        </Container>

        {/* CTA */}
        <Container className="pb-8">
          <div className="rounded-[var(--radius-base)] bg-ink px-8 py-14 text-paper">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight">
              Built by operators. Not recruiters.
            </h2>
            <p className="mt-3 max-w-xl text-stone-300">
              We&apos;ve run the cafés, bars, hotels and shops. We built SHIFTED
              because hiring shouldn&apos;t feel broken — it should feel like
              finding your next chapter.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink
                href="/signup"
                size="lg"
                className="bg-paper text-ink hover:bg-stone-200"
              >
                Get started
              </ButtonLink>
            </div>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}

function ValueProp({
  kicker,
  title,
  body,
}: {
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <p className="eyebrow">{kicker}</p>
      <h3 className="mt-2 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-stone-600">{body}</p>
    </div>
  );
}
