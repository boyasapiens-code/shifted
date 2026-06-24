import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { JobCard } from "@/components/JobCard";
import { ButtonLink, Container } from "@/components/ui";
import { VerificationLadder } from "@/components/VerificationBadge";
import { getPublishedJobs } from "@/lib/queries";
import { INDUSTRIES } from "@/lib/constants";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; next?: string }>;
}) {
  // Safety net: forward a stray auth code on the homepage to the callback.
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
        {/* ---------------- Hero ---------------- */}
        <section className="relative overflow-hidden border-b border-stone-200">
          <div className="grid-texture pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
          <Container className="relative grid items-center gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
            <div>
              <p className="eyebrow flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                The right shift can change everything
              </p>
              <h1 className="mt-5 text-5xl font-black leading-[1.02] tracking-tightest sm:text-6xl">
                Better jobs.
                <br />
                Better people.
                <br />
                Better workplaces.
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-stone-600">
                SHIFTED is the vetted talent network for Hospitality, Retail &amp;
                Lifestyle. We connect great people with great companies — so
                everyone can move forward.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/jobs" size="lg">
                  Find a Job
                </ButtonLink>
                <ButtonLink href="/signup" size="lg" variant="outline">
                  Hire Talent
                </ButtonLink>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-500">
                {["Vetted employers", "Pre-screened candidates", "Two-way reviews"].map(
                  (t) => (
                    <li key={t} className="flex items-center gap-1.5">
                      <CheckIcon /> {t}
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* Product preview */}
            <div className="relative hidden lg:block">
              <PreviewCard />
            </div>
          </Container>
        </section>

        {/* ---------------- Industry strip ---------------- */}
        <Container className="py-10">
          <p className="eyebrow mb-3">Browse by industry</p>
          <div className="flex flex-wrap gap-2">
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

        {/* ---------------- Brand pillars ---------------- */}
        <section className="border-y border-stone-200 bg-stone-50">
          <Container className="grid gap-x-10 gap-y-12 py-16 sm:grid-cols-2 lg:grid-cols-4">
            <Pillar
              icon={<UserIcon />}
              kicker="People First"
              title="We put people before process"
              body="Pre-screened candidates and verified employers. No fake resumes, no ghost listings."
            />
            <Pillar
              icon={<ShieldIcon />}
              kicker="Built on Trust"
              title="Trust is our foundation"
              body="Clear salaries, real workplace photos, and reputation that compounds over time."
            />
            <Pillar
              icon={<ArrowIcon />}
              kicker="Move Forward"
              title="We create opportunities"
              body="One-click apply, fast matching, and a hiring process that doesn't feel broken."
            />
            <Pillar
              icon={<UsersIcon />}
              kicker="Stronger Together"
              title="Better teams. Better workplaces."
              body="Good people and good companies, raising the standard for the whole industry."
            />
          </Container>
        </section>

        {/* ---------------- Verification explainer ---------------- */}
        <Container className="py-16">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="eyebrow">Earned, not typed</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                A profile is proven — on both sides.
              </h2>
              <p className="mt-3 max-w-md text-stone-600">
                Candidates clear four levels of verified screening. Employers earn
                a four-layer trust badge. Each side can filter the other by
                verification level — so you only deal with the real, the
                qualified, and the fair.
              </p>
              <ButtonLink href="/about" variant="outline" className="mt-6">
                How it works
              </ButtonLink>
            </div>
            <div className="rounded-[var(--radius-card)] border border-stone-200 bg-paper p-6 shadow-[var(--shadow-sm)]">
              {[
                ["1", "Identity & basics", "ID, work permit, certifications"],
                ["2", "Online persona", "Authentic, linked identities"],
                ["3", "Credentials & history", "Education, work history, references"],
                ["4", "Skills & attitude", "Proven skills and team fit"],
              ].map(([n, name, desc], idx) => (
                <div
                  key={n as string}
                  className={`flex items-center gap-4 py-3 ${idx > 0 ? "border-t border-stone-100" : ""}`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal/10 text-sm font-semibold text-signal">
                    {n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{name}</p>
                    <p className="text-xs text-stone-500">{desc}</p>
                  </div>
                </div>
              ))}
              <div className="mt-3 border-t border-stone-100 pt-4">
                <VerificationLadder level={3} />
              </div>
            </div>
          </div>
        </Container>

        {/* ---------------- Featured jobs ---------------- */}
        <Container className="pb-16">
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
            <div className="rounded-[var(--radius-card)] border border-dashed border-stone-300 p-10 text-center text-stone-500">
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

        {/* ---------------- CTA ---------------- */}
        <Container className="pb-8">
          <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-ink px-8 py-14 text-paper sm:px-12">
            <div className="grid-texture pointer-events-none absolute inset-0 opacity-[0.5] [mask-image:radial-gradient(ellipse_at_right,black,transparent_70%)]" />
            <div className="relative">
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
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
                  className="bg-paper text-ink shadow-none hover:bg-stone-200"
                >
                  Get started
                </ButtonLink>
                <ButtonLink
                  href="/jobs"
                  size="lg"
                  variant="outline"
                  className="border-stone-600 text-paper hover:border-paper hover:bg-white/5"
                >
                  Browse jobs
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

function Pillar({
  icon,
  kicker,
  title,
  body,
}: {
  icon: React.ReactNode;
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-base)] border border-stone-200 bg-paper text-ink">
        {icon}
      </div>
      <p className="eyebrow mt-4">{kicker}</p>
      <h3 className="mt-1.5 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">{body}</p>
    </div>
  );
}

/** Decorative job-card preview for the hero. */
function PreviewCard() {
  return (
    <div className="relative mx-auto max-w-sm">
      <div className="absolute -right-4 -top-4 h-full w-full rotate-3 rounded-[var(--radius-card)] border border-stone-200 bg-stone-50" />
      <div className="relative rounded-[var(--radius-card)] border border-stone-200 bg-paper p-6 shadow-[var(--shadow-lg)]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-base)] bg-ink text-lg font-black text-paper">
            S
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-ink">Budtender</p>
              <span className="text-sm font-semibold text-ink">฿14k–18k</span>
            </div>
            <p className="flex items-center gap-1.5 text-sm text-stone-500">
              Stash BKK
              <span className="inline-flex items-center gap-1 rounded-full bg-signal/10 px-2 py-0.5 text-[11px] font-semibold text-signal">
                <ShieldIcon className="h-3 w-3" /> L2 verified
              </span>
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {["Cannabis", "Full-time", "Shift work", "Bangkok"].map((t) => (
            <span
              key={t}
              className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-xs font-medium text-stone-600"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="mt-5 flex h-11 items-center justify-center rounded-[var(--radius-base)] bg-ink text-sm font-medium text-paper">
          One-click apply
        </div>
        <p className="mt-3 text-center text-xs text-stone-400">
          92% would re-hire · 4.8 ★ from past employers
        </p>
      </div>
    </div>
  );
}

// --- inline outline icons (brand iconography) ---
function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-signal" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10.5l3.5 3.5L16 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
    </svg>
  );
}
function ShieldIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z" strokeLinejoin="round" />
      <path d="M8.5 12l2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" strokeLinecap="round" />
      <path d="M16 5.5a3 3 0 010 5.8M17 15c2.5.4 4 2 4 5" strokeLinecap="round" />
    </svg>
  );
}
