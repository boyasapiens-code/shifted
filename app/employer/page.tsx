import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, ButtonLink, Container } from "@/components/ui";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { RatingSummary } from "@/components/Rating";
import { requireRole } from "@/lib/auth";
import { INDUSTRY_LABEL } from "@/lib/constants";
import type { Industry } from "@/lib/types";

export const metadata: Metadata = { title: "Employer dashboard" };

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  published: "Live",
  closed: "Closed",
};

export default async function EmployerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const { supabase, user } = await requireRole("employer", "/employer");

  const { data: employer } = await supabase
    .from("employer_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, status, created_at, applications(count)")
    .eq("employer_id", user.id)
    .order("created_at", { ascending: false });

  const { data: staff } = await supabase
    .from("staff")
    .select("id, full_name, role_title, net_salary, currency, period")
    .eq("employer_id", user.id)
    .order("full_name", { ascending: true });

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="py-12">
          {saved && (
            <p className="mb-6 rounded-[var(--radius-base)] bg-stone-100 px-3 py-2 text-sm text-ink">
              Company profile saved.
            </p>
          )}

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Employer</p>
              <h1 className="mt-2 flex items-center gap-2 text-3xl font-semibold tracking-tight">
                {employer?.company_name}
                {employer && <VerifiedBadge status={employer.verification} />}
              </h1>
              <p className="mt-1 text-stone-500">
                {employer ? INDUSTRY_LABEL[employer.industry as Industry] : ""}
                {employer?.location ? ` · ${employer.location}` : ""}
              </p>
              {employer && (
                <div className="mt-2">
                  <RatingSummary avg={employer.rating_avg} count={employer.rating_count} />
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/employer/engagements" variant="outline">
                Engagements
              </ButtonLink>
              <ButtonLink href="/employer/profile" variant="outline">
                Edit company
              </ButtonLink>
              <ButtonLink href="/employer/jobs/new">Post a job</ButtonLink>
            </div>
          </div>

          {/* Verification nudge */}
          {employer && employer.verification !== "verified" && (
            <div className="mt-6 rounded-[var(--radius-base)] border border-stone-200 bg-stone-50 p-5">
              <p className="font-medium text-ink">Get verified</p>
              <p className="mt-1 text-sm text-stone-600">
                Verified employers get more and better applicants. Add business
                registration, workplace photos, and salary transparency on your{" "}
                <Link href="/employer/profile" className="underline">
                  company profile
                </Link>
                .
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge>
                  {employer.business_registered ? "✓" : "—"} Business registered
                </Badge>
                <Badge>
                  {employer.salary_transparency ? "✓" : "—"} Salary transparency
                </Badge>
                <Badge>
                  {employer.photos?.length ? "✓" : "—"} Workplace photos
                </Badge>
              </div>
            </div>
          )}

          {/* Jobs */}
          <h2 className="mt-12 text-xl font-semibold tracking-tight">Your jobs</h2>
          {jobs && jobs.length > 0 ? (
            <ul className="mt-4 divide-y divide-stone-100 rounded-[var(--radius-base)] border border-stone-200">
              {jobs.map((job) => {
                const count =
                  Array.isArray(job.applications) && job.applications.length
                    ? (job.applications[0] as { count: number }).count
                    : 0;
                return (
                  <li
                    key={job.id}
                    className="flex items-center justify-between gap-4 p-4"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/employer/jobs/${job.id}`}
                        className="font-medium text-ink hover:underline"
                      >
                        {job.title}
                      </Link>
                      <p className="text-sm text-stone-500">
                        {count} {count === 1 ? "applicant" : "applicants"}
                      </p>
                    </div>
                    <Badge>{STATUS_LABEL[job.status] ?? job.status}</Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-4 rounded-[var(--radius-base)] border border-dashed border-stone-300 p-10 text-center text-stone-500">
              <p className="font-medium text-ink">No jobs yet.</p>
              <p className="mt-1 text-sm">Post your first role to start hiring.</p>
              <ButtonLink href="/employer/jobs/new" className="mt-4">
                Post a job
              </ButtonLink>
            </div>
          )}

          {/* Team — staff/payroll records (private to the employer) */}
          {staff && staff.length > 0 && (
            <>
              <div className="mt-12 flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">Team</h2>
                <span className="text-sm text-stone-500">
                  {staff.length} {staff.length === 1 ? "person" : "people"}
                </span>
              </div>
              <ul className="mt-4 divide-y divide-stone-100 rounded-[var(--radius-base)] border border-stone-200">
                {staff.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-4 p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{s.full_name}</p>
                      <p className="text-sm text-stone-500">
                        {s.role_title ?? "Staff"}
                        {s.period ? ` · ${s.period}` : ""}
                      </p>
                    </div>
                    {s.net_salary != null && (
                      <span className="shrink-0 text-sm font-semibold text-ink">
                        ฿{s.net_salary.toLocaleString("en-US")}
                        <span className="font-normal text-stone-400"> net</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
