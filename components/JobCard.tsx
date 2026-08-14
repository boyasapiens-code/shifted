import Link from "next/link";
import type { JobWithEmployer } from "@/lib/types";
import type { MatchResult } from "@/lib/matching/types";
import type { Dict, Locale } from "@/lib/i18n";
import { EMPLOYMENT_TYPE_LABEL, formatSalary, isBoosted } from "@/lib/constants";
import { Badge } from "./ui";
import { VerificationBadge } from "./VerificationBadge";
import { SaveJobButton } from "./SaveJobButton";

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12 21s7-6.5 7-11.5A7 7 0 105 9.5C5 14.5 12 21 12 21z" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}
function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="3" y="7.5" width="18" height="12" rx="2" />
      <path d="M8 7.5V6a2 2 0 012-2h4a2 2 0 012 2v1.5" strokeLinecap="round" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function JobCard({
  job,
  match,
  locale,
  t,
  saved = false,
  canSave = false,
}: {
  job: JobWithEmployer;
  match?: MatchResult;
  locale: Locale;
  t: Dict;
  saved?: boolean;
  canSave?: boolean;
}) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_period, locale);
  const showMatch = match && !match.gated && match.confidence >= 0.5;
  const postedDate = job.published_at
    ? new Date(job.published_at).toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="card-interactive group relative flex flex-col gap-3 rounded-[var(--radius-card)] border border-stone-200 bg-paper p-5">
      {/* Full-card link — sits behind everything (z-0); SaveJobButton sits
          above it (z-10) so the two controls don't nest inside each other.
          Everything else in the card is non-interactive, so it's fine for
          the invisible link to be "on top" there — clicks land on it. */}
      <Link
        href={`/jobs/${job.id}`}
        className="absolute inset-0 z-0 rounded-[var(--radius-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      >
        <span className="sr-only">
          {t.jobDetail.viewDetails}: {job.title}
        </span>
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {job.employer?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={job.employer.logo_url}
              alt=""
              className="mt-0.5 h-9 w-9 shrink-0 rounded-[var(--radius-base)] border border-stone-200 object-cover"
            />
          )}
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-ink">
              {job.title}
            </h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-500">
              <span className="truncate">{job.employer?.company_name ?? "—"}</span>
              {job.employer && (
                <VerificationBadge level={job.employer.verification_level} kind="employer" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Salary — its own row, never squeezed against the title. */}
      <p className="text-lg font-semibold tracking-tight text-ink">
        {salary ?? <span className="text-sm font-normal text-stone-400">{t.jobDetail.salaryNotSpecified}</span>}
      </p>

      {/* Quiet metadata — icons + text, not another row of pills. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
        <span className="inline-flex items-center gap-1">
          <BriefcaseIcon />
          {EMPLOYMENT_TYPE_LABEL[job.employment_type]}
        </span>
        {job.location && (
          <span className="inline-flex items-center gap-1">
            <PinIcon />
            {job.location}
          </span>
        )}
        {job.shift_work && (
          <span className="inline-flex items-center gap-1">
            <ClockIcon />
            {t.jobDetail.shiftWork}
          </span>
        )}
      </div>

      {/* Badges reserved for verification/promotion/match — never diluted
          with ordinary metadata. */}
      {(showMatch || isBoosted(job.boosted_until) || job.employer?.featured || (job.employer?.response_rate ?? 0) >= 0.75) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {showMatch && (
            <span
              className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600"
              title={t.match.explain}
            >
              {t.match.label(match!.score)}
            </span>
          )}
          {isBoosted(job.boosted_until) && <Badge tone="blue">{t.employer.promoted}</Badge>}
          {job.employer?.featured && <Badge tone="amber">{t.jobs.featured}</Badge>}
          {(job.employer?.response_rate ?? 0) >= 0.75 && <Badge tone="green">{t.jobs.responsive}</Badge>}
        </div>
      )}

      <div className="mt-1 flex items-center justify-between gap-3 border-t border-stone-100 pt-3">
        <span className="text-xs text-stone-400">
          {postedDate ? `${t.jobs.postedLabel} ${postedDate}` : null}
        </span>
        <div className="flex items-center gap-2">
          {canSave && (
            <SaveJobButton
              jobId={job.id}
              saved={saved}
              saveLabel={t.jobDetail.save}
              savedLabel={t.jobDetail.saved}
            />
          )}
          <span className="relative z-[1] text-sm font-medium text-signal group-hover:underline">
            {t.jobDetail.viewDetails} →
          </span>
        </div>
      </div>
    </div>
  );
}
