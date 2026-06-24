import Link from "next/link";
import type { JobWithEmployer } from "@/lib/types";
import { EMPLOYMENT_TYPE_LABEL, INDUSTRY_LABEL, formatSalary } from "@/lib/constants";
import { Badge } from "./ui";
import { VerificationBadge } from "./VerificationBadge";

export function JobCard({ job }: { job: JobWithEmployer }) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_period);
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group flex flex-col gap-3 rounded-[var(--radius-base)] border border-stone-200 bg-paper p-5 transition-colors hover:border-ink"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {job.employer?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={job.employer.logo_url}
              alt=""
              className="mt-0.5 h-9 w-9 shrink-0 rounded-[var(--radius-base)] border border-stone-200 object-cover"
            />
          )}
          <div>
            <h3 className="text-base font-semibold tracking-tight text-ink group-hover:underline">
              {job.title}
            </h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-500">
              <span>{job.employer?.company_name ?? "Company"}</span>
              {job.employer && (
                <VerificationBadge level={job.employer.verification_level} kind="employer" />
              )}
            </div>
          </div>
        </div>
        {salary && (
          <span className="shrink-0 text-sm font-semibold text-ink">{salary}</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge>{INDUSTRY_LABEL[job.industry]}</Badge>
        <Badge>{EMPLOYMENT_TYPE_LABEL[job.employment_type]}</Badge>
        {job.shift_work && <Badge>Shift work</Badge>}
        {job.location && <Badge>{job.location}</Badge>}
      </div>
    </Link>
  );
}
