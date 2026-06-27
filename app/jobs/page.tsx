import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { JobCard } from "@/components/JobCard";
import { Container, Input, Select, buttonClass } from "@/components/ui";
import { getPublishedJobs } from "@/lib/queries";
import { EMPLOYMENT_TYPES, INDUSTRIES, EMPLOYER_VERIFICATION_LAYERS } from "@/lib/constants";
import type { EmploymentType, Industry } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { matchScore } from "@/lib/matching/score";
import { jobToMatch, workerToMatch, type JobRow, type CandidateRow } from "@/lib/matching/adapt";
import type { MatchResult } from "@/lib/matching/types";
import { getDict } from "@/lib/i18n";

export const metadata: Metadata = { title: "Find work" };

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const t = (await getDict()).jobs;
  const jobs = await getPublishedJobs({
    q: sp.q || undefined,
    industry: (sp.industry as Industry) || undefined,
    employment_type: (sp.employment_type as EmploymentType) || undefined,
    location: sp.location || undefined,
    salaryMin: sp.salaryMin ? Number(sp.salaryMin) : undefined,
    shiftWork: sp.shiftWork === "1",
    employerMinLevel: sp.employerMinLevel ? Number(sp.employerMinLevel) : undefined,
  });

  // Symmetric match score — shown to the logged-in worker for each job, and used
  // to re-rank the feed. Boosted jobs get a capped lift (never bury a real 90).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let matches: Map<string, MatchResult> | null = null;
  if (user) {
    const { data: candidate } = await supabase
      .from("candidate_profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (candidate) {
      const worker = workerToMatch(candidate as unknown as CandidateRow);
      matches = new Map(
        jobs.map((j) => [j.id, matchScore(jobToMatch(j as unknown as JobRow), worker)]),
      );
      const lift = (id: string, boosted: boolean) => {
        const s = matches!.get(id)?.score ?? 0;
        return boosted ? Math.min(s + 10, s < 90 ? 89 : 100) : s;
      };
      jobs.sort(
        (a, b) =>
          lift(b.id, !!b.boosted_until && new Date(b.boosted_until) > new Date()) -
          lift(a.id, !!a.boosted_until && new Date(a.boosted_until) > new Date()),
      );
    }
  }

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="py-12">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {t.heading}
          </h1>
          <p className="mt-1 text-stone-500">{t.sub}</p>

          {/* Filters — plain GET form, server-rendered results */}
          <form className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <Input
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder={t.searchPlaceholder}
              />
            </div>
            <Input
              name="location"
              defaultValue={sp.location ?? ""}
              placeholder={t.locationPlaceholder}
            />
            <Select name="industry" defaultValue={sp.industry ?? ""}>
              <option value="">{t.allIndustries}</option>
              {INDUSTRIES.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </Select>
            <Select name="employment_type" defaultValue={sp.employment_type ?? ""}>
              <option value="">{t.anyType}</option>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
            <Select name="employerMinLevel" defaultValue={sp.employerMinLevel ?? ""}>
              <option value="">{t.anyEmployer}</option>
              {EMPLOYER_VERIFICATION_LAYERS.map((l) => (
                <option key={l.level} value={l.level}>
                  {t.verifiedL}{l.level}+
                </option>
              ))}
            </Select>
            <Input
              name="salaryMin"
              type="number"
              min={0}
              step={1000}
              defaultValue={sp.salaryMin ?? ""}
              placeholder={t.minSalary}
            />
            <label className="flex items-center gap-2 px-1 text-sm text-stone-600">
              <input
                type="checkbox"
                name="shiftWork"
                value="1"
                defaultChecked={sp.shiftWork === "1"}
                className="h-4 w-4 accent-[var(--color-ink)]"
              />
              {t.shiftWork}
            </label>
            <button type="submit" className={buttonClass("primary", "md")}>
              {t.search}
            </button>
          </form>

          {/* Results */}
          <p className="mt-8 text-sm text-stone-500">
            {jobs.length} {jobs.length === 1 ? t.role : t.roles}
          </p>
          {jobs.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} match={matches?.get(job.id)} />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[var(--radius-base)] border border-dashed border-stone-300 p-10 text-center text-stone-500">
              {t.noResults}
            </div>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
