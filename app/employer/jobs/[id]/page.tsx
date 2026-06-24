import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, Container, Select, buttonClass } from "@/components/ui";
import { VerificationBadge } from "@/components/VerificationBadge";
import { RehireSignal } from "@/components/RehireSignal";
import { requireEmployer } from "@/lib/auth";
import {
  APPLICATION_STATUS_LABEL,
  EMPLOYMENT_TYPE_LABEL,
  formatSalary,
} from "@/lib/constants";
import type { ApplicationStatus, EmploymentType } from "@/lib/types";
import { setApplicationStatus, setJobStatus, startEngagement } from "../../actions";
import { messageWorker } from "@/app/messages/actions";
import { boostJob } from "../../billing/actions";
import { isBoosted } from "@/lib/constants";

export const metadata: Metadata = { title: "Manage job" };

const PIPELINE: ApplicationStatus[] = [
  "applied",
  "shortlisted",
  "interviewing",
  "offered",
  "hired",
  "rejected",
];

export default async function ManageJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireEmployer("/employer");

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .eq("employer_id", user.id)
    .single();
  if (!job) notFound();

  const { data: applications } = await supabase
    .from("applications")
    .select(
      "id, status, cover_note, created_at, candidate:candidate_profiles(id, full_name, headline, location, skills, languages, years_experience, open_to_work, verification_level, reference_count, would_rehire_count, no_show_count)",
    )
    .eq("job_id", id)
    .order("created_at", { ascending: false });

  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_period);

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="py-12">
          <Link href="/employer" className="text-sm text-stone-500 hover:text-ink">
            ← Dashboard
          </Link>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{job.title}</h1>
              <p className="mt-1 text-stone-500">
                {EMPLOYMENT_TYPE_LABEL[job.employment_type as EmploymentType]}
                {job.location ? ` · ${job.location}` : ""}
                {salary ? ` · ${salary}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge>
                {job.status === "published"
                  ? "Live"
                  : job.status === "closed"
                    ? "Closed"
                    : "Draft"}
              </Badge>
              {job.status !== "published" ? (
                <form action={setJobStatus.bind(null, job.id, "published")}>
                  <button className={buttonClass("primary", "sm")}>Publish</button>
                </form>
              ) : (
                <form action={setJobStatus.bind(null, job.id, "closed")}>
                  <button className={buttonClass("outline", "sm")}>Close</button>
                </form>
              )}
              {job.status === "published" &&
                (isBoosted(job.boosted_until) ? (
                  <Badge tone="blue">Promoted</Badge>
                ) : (
                  <form action={boostJob.bind(null, job.id)}>
                    <button className={buttonClass("ghost", "sm")}>Boost</button>
                  </form>
                ))}
            </div>
          </div>

          <h2 className="mt-10 text-xl font-semibold tracking-tight">
            Applicants ({applications?.length ?? 0})
          </h2>

          {applications && applications.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {applications.map((app) => {
                const c = Array.isArray(app.candidate)
                  ? app.candidate[0]
                  : app.candidate;
                const name = c?.full_name || "Candidate";
                return (
                  <li
                    key={app.id}
                    className="rounded-[var(--radius-base)] border border-stone-200 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-ink">{name}</p>
                          <VerificationBadge level={c?.verification_level ?? 0} />
                          {c?.open_to_work && <Badge>Open to work</Badge>}
                        </div>
                        <p className="text-sm text-stone-500">
                          {c?.headline ?? "—"}
                          {c?.location ? ` · ${c.location}` : ""}
                          {typeof c?.years_experience === "number"
                            ? ` · ${c.years_experience} yrs`
                            : ""}
                        </p>
                        {c?.skills?.length ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {c.skills.slice(0, 6).map((s: string) => (
                              <Badge key={s}>{s}</Badge>
                            ))}
                          </div>
                        ) : null}
                        {c && (
                          <div className="mt-2">
                            <RehireSignal
                              refCount={c.reference_count ?? 0}
                              rehireCount={c.would_rehire_count ?? 0}
                              noShowCount={c.no_show_count ?? 0}
                            />
                          </div>
                        )}
                        {app.cover_note && (
                          <p className="mt-3 border-l-2 border-stone-200 pl-3 text-sm text-stone-600">
                            {app.cover_note}
                          </p>
                        )}
                      </div>

                      {/* Pipeline control + hire */}
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <form
                          action={setApplicationStatus.bind(null, app.id, job.id)}
                          className="flex items-center gap-2"
                        >
                          <Select
                            name="status"
                            defaultValue={app.status}
                            className="h-9 text-sm"
                          >
                            {PIPELINE.map((s) => (
                              <option key={s} value={s}>
                                {APPLICATION_STATUS_LABEL[s]}
                              </option>
                            ))}
                          </Select>
                          <button className={buttonClass("outline", "sm")}>Save</button>
                        </form>
                        {c && (
                          <div className="flex gap-2">
                            <form action={messageWorker.bind(null, c.id, job.id)}>
                              <button className={buttonClass("outline", "sm")}>
                                Message
                              </button>
                            </form>
                            <form action={startEngagement.bind(null, job.id, c.id)}>
                              <button className={buttonClass("ghost", "sm")}>
                                Hire →
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-4 rounded-[var(--radius-base)] border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
              No applicants yet.{" "}
              {job.status !== "published"
                ? "Publish this job so candidates can find it."
                : "Share your role to attract candidates."}
            </div>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
