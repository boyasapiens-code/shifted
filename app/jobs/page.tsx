import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { JobCard } from "@/components/JobCard";
import { Disclosure } from "@/components/Disclosure";
import { AutoSubmitSelect } from "@/components/AutoSubmitSelect";
import { Container, Input, Select, Label, buttonClass, cn } from "@/components/ui";
import { getPublishedJobsWithStatus, getSavedJobIds } from "@/lib/queries";
import { EMPLOYMENT_TYPES, INDUSTRIES, EMPLOYER_VERIFICATION_LAYERS } from "@/lib/constants";
import type { EmploymentType, Industry } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { matchScore } from "@/lib/matching/score";
import { jobToMatch, workerToMatch, type JobRow, type CandidateRow } from "@/lib/matching/adapt";
import type { MatchResult } from "@/lib/matching/types";
import { getDict, getLocale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Find work" };

type SortKey = "recommended" | "newest" | "salary";
const SORT_KEYS: SortKey[] = ["recommended", "newest", "salary"];

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const [dict, locale] = await Promise.all([getDict(), getLocale()]);
  const t = dict.jobs;
  const sort: SortKey = SORT_KEYS.includes(sp.sort as SortKey) ? (sp.sort as SortKey) : "recommended";

  const { jobs, error } = await getPublishedJobsWithStatus({
    q: sp.q || undefined,
    industry: (sp.industry as Industry) || undefined,
    employment_type: (sp.employment_type as EmploymentType) || undefined,
    location: sp.location || undefined,
    salaryMin: sp.salaryMin ? Number(sp.salaryMin) : undefined,
    shiftWork: sp.shiftWork === "1",
    employerMinLevel: sp.employerMinLevel ? Number(sp.employerMinLevel) : undefined,
  });

  // Symmetric match score — shown to the logged-in candidate for each job.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let matches: Map<string, MatchResult> | null = null;
  let savedIds = new Set<string>();
  let canSave = false;
  if (user) {
    const { data: candidate } = await supabase
      .from("candidate_profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (candidate) {
      canSave = true;
      const worker = workerToMatch(candidate as unknown as CandidateRow);
      matches = new Map(
        jobs.map((j) => [j.id, matchScore(jobToMatch(j as unknown as JobRow), worker)]),
      );
      savedIds = await getSavedJobIds(user.id);
    }
  }

  // Ordering. "recommended" (default) keeps the DB's boosted->newest order
  // for guests, or re-ranks by match score (capped boost lift) for a
  // logged-in candidate — same logic as before. "newest"/"salary" are new:
  // real sort choices, computed in memory (no pagination exists yet to
  // complicate this — see NOTES.md).
  const isBoostedNow = (j: (typeof jobs)[number]) =>
    !!j.boosted_until && new Date(j.boosted_until) > new Date();
  const lift = (id: string, boosted: boolean) => {
    const s = matches?.get(id)?.score ?? 0;
    return boosted ? Math.min(s + 10, s < 90 ? 89 : 100) : s;
  };
  let sorted = jobs;
  if (sort === "newest") {
    sorted = [...jobs].sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
  } else if (sort === "salary") {
    const key = (j: (typeof jobs)[number]) => Math.max(j.salary_min ?? -1, j.salary_max ?? -1);
    sorted = [...jobs].sort((a, b) => key(b) - key(a));
  } else if (matches) {
    sorted = [...jobs].sort(
      (a, b) => lift(b.id, isBoostedNow(b)) - lift(a.id, isBoostedNow(a)),
    );
  }

  // Active filters -> removable chips. Each chip links to the same search
  // with just that one param dropped (plain links, no client JS).
  const dropParam = (key: string) => {
    const next = new URLSearchParams(
      Object.entries(sp).filter(([k, v]) => k !== key && v) as [string, string][],
    );
    return `/jobs${next.toString() ? `?${next.toString()}` : ""}`;
  };
  const chips: { key: string; label: string }[] = [];
  if (sp.q) chips.push({ key: "q", label: `"${sp.q}"` });
  if (sp.location) chips.push({ key: "location", label: sp.location });
  if (sp.industry) {
    const i = INDUSTRIES.find((x) => x.value === sp.industry);
    if (i) chips.push({ key: "industry", label: i.label });
  }
  if (sp.employment_type) {
    const et = EMPLOYMENT_TYPES.find((x) => x.value === sp.employment_type);
    if (et) chips.push({ key: "employment_type", label: et.label });
  }
  if (sp.employerMinLevel) chips.push({ key: "employerMinLevel", label: t.verifiedL(Number(sp.employerMinLevel)) });
  if (sp.salaryMin) chips.push({ key: "salaryMin", label: `฿${Number(sp.salaryMin).toLocaleString("en-US")}+` });
  if (sp.shiftWork === "1") chips.push({ key: "shiftWork", label: t.shiftWork });
  const advancedCount = chips.filter((c) => c.key !== "q" && c.key !== "location").length;
  const clearAllHref = sp.sort ? `/jobs?sort=${sp.sort}` : "/jobs";

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="py-10">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{t.heading}</h1>
          <p className="mt-1 text-sm text-stone-500">{t.sub}</p>

          {/* Primary search row + collapsible advanced filters — one form. */}
          <form className="mt-6">
            <input type="hidden" name="sort" value={sort} />
            {/* Row 1: keyword + location + search — a plain flex row. The
                expandable filters section below is deliberately NOT another
                item in this row: nesting an expanding panel inside a flex
                item with items-end alignment breaks the whole row's layout
                the moment the panel opens (every sibling re-aligns to the
                new, much taller item) — caught live, fixed by giving the
                filters their own block below instead of trying to keep
                "More filters" visually glued to the Search button. */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label htmlFor="jobs-q">{t.searchLabel}</Label>
                <Input id="jobs-q" name="q" defaultValue={sp.q ?? ""} placeholder={t.searchPlaceholder} />
              </div>
              <div className="sm:w-52">
                <Label htmlFor="jobs-location">{t.locationLabel}</Label>
                <Input
                  id="jobs-location"
                  name="location"
                  defaultValue={sp.location ?? ""}
                  placeholder={t.locationPlaceholder}
                />
              </div>
              <button type="submit" className={buttonClass("primary", "md")}>
                {t.search}
              </button>
            </div>

            {/* Row 2: the collapsible advanced-filters toggle, its own block. */}
            <div className="mt-3">
              <Disclosure
                triggerLabel={t.moreFilters}
                triggerClassName={cn(
                  "h-11 w-auto rounded-[var(--radius-base)] border border-stone-200 px-4 text-sm font-medium text-ink hover:border-stone-300",
                )}
                triggerContent={
                  <>
                    <span className="hidden sm:inline">{t.moreFilters}</span>
                    <span className="sm:hidden">{t.filtersButton(advancedCount)}</span>
                  </>
                }
                panelPosition="fixed"
                closeOnInnerClick={false}
                panelClassName="inset-x-3 top-[4.25rem] w-auto md:static md:inset-auto md:top-auto md:mt-3 md:w-full md:max-h-none md:overflow-visible md:border-0 md:bg-transparent md:p-0 md:shadow-none"
              >
                <div className="flex items-center justify-between border-b border-stone-100 px-2 pb-2 md:hidden">
                  <p className="text-sm font-semibold text-ink">{t.moreFilters}</p>
                  <button
                    type="button"
                    data-disclosure-close
                    aria-label={t.closeFilters}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-stone-400 hover:text-ink"
                  >
                    ×
                  </button>
                </div>
                <div className="grid gap-4 p-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <Label htmlFor="jobs-industry">{t.industryLabel}</Label>
                    <Select id="jobs-industry" name="industry" defaultValue={sp.industry ?? ""}>
                      <option value="">{t.allIndustries}</option>
                      {INDUSTRIES.map((i) => (
                        <option key={i.value} value={i.value}>
                          {i.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="jobs-type">{t.typeLabel}</Label>
                    <Select id="jobs-type" name="employment_type" defaultValue={sp.employment_type ?? ""}>
                      <option value="">{t.anyType}</option>
                      {EMPLOYMENT_TYPES.map((et) => (
                        <option key={et.value} value={et.value}>
                          {et.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="jobs-verification">{t.verificationLabel}</Label>
                    <Select id="jobs-verification" name="employerMinLevel" defaultValue={sp.employerMinLevel ?? ""}>
                      <option value="">{t.anyEmployer}</option>
                      {EMPLOYER_VERIFICATION_LAYERS.map((l) => (
                        <option key={l.level} value={l.level}>
                          {t.verifiedL(l.level)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="jobs-salary-min">{t.minSalaryLabel}</Label>
                    <Input
                      id="jobs-salary-min"
                      name="salaryMin"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1000}
                      defaultValue={sp.salaryMin ?? ""}
                      placeholder={t.minSalary}
                    />
                  </div>
                </div>
                <label className="mt-1 flex items-center gap-2 px-2 py-2 text-sm text-stone-600">
                  <input
                    type="checkbox"
                    name="shiftWork"
                    value="1"
                    defaultChecked={sp.shiftWork === "1"}
                    className="h-4 w-4 accent-[var(--color-ink)]"
                  />
                  {t.shiftWork}
                </label>
                <div className="flex items-center gap-2 border-t border-stone-100 p-2 pt-3 md:border-0 md:pt-2">
                  <button type="submit" className={buttonClass("primary", "md")}>
                    {t.applyFilters}
                  </button>
                  <Link href={clearAllHref} className={buttonClass("ghost", "md")}>
                      {t.clearFilters}
                    </Link>
                </div>
              </Disclosure>
            </div>
          </form>

          {/* Result count (aria-live so screen readers hear updates on
              re-search) + active-filter chips + clear-all + sort. */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p aria-live="polite" className="text-sm text-stone-500">
              {error ? t.searchError : `${sorted.length} ${sorted.length === 1 ? t.role : t.roles}`}
            </p>
            <div className="flex items-center gap-2">
              <Label htmlFor="jobs-sort" className="mb-0 shrink-0 text-xs text-stone-400">
                {t.sortLabel}
              </Label>
              <form>
                {Object.entries(sp)
                  .filter(([k]) => k !== "sort")
                  .map(([k, v]) =>
                    v ? <input key={k} type="hidden" name={k} value={v} /> : null,
                  )}
                <AutoSubmitSelect id="jobs-sort" name="sort" defaultValue={sort} className="h-9 text-sm">
                  <option value="recommended">{t.sortRecommended}</option>
                  <option value="newest">{t.sortNewest}</option>
                  <option value="salary">{t.sortSalary}</option>
                </AutoSubmitSelect>
              </form>
            </div>
          </div>

          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-stone-400">{t.activeFilters}</span>
              {chips.map((c) => (
                <Link
                  key={c.key}
                  href={dropParam(c.key)}
                  className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-600 hover:border-stone-300 hover:text-ink"
                >
                  {c.label}
                  <span aria-hidden="true">×</span>
                </Link>
              ))}
              <Link href={clearAllHref} className="text-xs font-medium text-signal hover:underline">
                {t.clearAll}
              </Link>
            </div>
          )}

          {/* Results */}
          {error ? (
            <div className="mt-4 rounded-[var(--radius-base)] border border-dashed border-danger/40 bg-danger/5 p-10 text-center text-danger">
              {t.searchError}
            </div>
          ) : sorted.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {sorted.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  match={matches?.get(job.id)}
                  locale={locale}
                  t={dict}
                  saved={savedIds.has(job.id)}
                  canSave={canSave}
                />
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
