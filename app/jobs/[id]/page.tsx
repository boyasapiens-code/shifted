import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { VerificationBadge } from "@/components/VerificationBadge";
import { ComplianceBadge } from "@/components/ComplianceBadge";
import { ReportButton } from "@/components/ReportButton";
import { QuestionField } from "@/components/Interview";
import { complianceStatus } from "@/lib/compliance";
import type { Question } from "@/lib/interview";
import { RatingSummary } from "@/components/Rating";
import { Badge, ButtonLink, Container, Textarea, buttonClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getJob } from "@/lib/queries";
import {
  APPLICATION_STATUS_LABEL,
  EMPLOYMENT_TYPE_LABEL,
  INDUSTRY_LABEL,
  formatSalary,
} from "@/lib/constants";
import {
  deriveRole,
  archetypeFit,
  ARCHETYPES,
  type ArchetypeKey,
} from "@/lib/archetypes";
import { applyToJob } from "./actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id);
  return { title: job ? `${job.title} · ${job.employer?.company_name ?? ""}` : "Job" };
}

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ applied?: string; error?: string }>;
}) {
  const { id } = await params;
  const { applied, error } = await searchParams;
  const job = await getJob(id);
  if (!job) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  let existingStatus: string | null = null;
  let workerArchetype: string | null = null;
  let fit: "strong" | "open" | null = null;
  let skillCoverage: { have: number; total: number } | null = null;
  const roleKey = deriveRole(job.title);

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? null;
    if (role === "candidate") {
      const { data: app } = await supabase
        .from("applications")
        .select("status")
        .eq("job_id", id)
        .eq("candidate_id", user.id)
        .maybeSingle();
      existingStatus = app?.status ?? null;

      // Fit for this worker: archetype affinity + verified-skill coverage.
      const { data: cp } = await supabase
        .from("candidate_profiles")
        .select("archetype")
        .eq("id", user.id)
        .single();
      workerArchetype = cp?.archetype ?? null;
      fit = archetypeFit(workerArchetype as ArchetypeKey | null, roleKey);

      if (roleKey) {
        const { data: roleSkills } = await supabase
          .from("skills")
          .select("id")
          .eq("role", roleKey)
          .not("badge_name", "is", null);
        const total = roleSkills?.length ?? 0;
        if (total) {
          const { count: have } = await supabase
            .from("worker_skills")
            .select("*", { count: "exact", head: true })
            .eq("worker_id", user.id)
            .eq("status", "employer_verified")
            .in("skill_id", roleSkills!.map((s) => s.id));
          skillCoverage = { have: have ?? 0, total };
        }
      }
    }
  }

  // Employer workplace media + reputation (public).
  const { data: employerMedia } = await supabase
    .from("employer_profiles")
    .select(
      "photos, description, rating_avg, rating_count, compliance_items, compliance_foreign_hires, compliance_headcount_10plus",
    )
    .eq("id", job.employer_id)
    .maybeSingle();
  const employerComplianceStatus = employerMedia
    ? complianceStatus(employerMedia.compliance_items ?? [], {
        foreignHires: employerMedia.compliance_foreign_hires ?? false,
        headcount10Plus: employerMedia.compliance_headcount_10plus ?? false,
      })
    : "none";

  // Closed-bank screening questions for this job (if the employer attached a set).
  const { data: qset } = await supabase
    .from("question_sets")
    .select("*")
    .eq("job_id", job.id)
    .maybeSingle();
  let setQuestions: Question[] = [];
  if (qset?.question_ids?.length) {
    const { data: qs } = await supabase.from("questions").select("*").in("id", qset.question_ids);
    const byId = new Map(((qs ?? []) as Question[]).map((q) => [q.id, q] as const));
    setQuestions = (qset.question_ids as string[])
      .map((id) => byId.get(id))
      .filter((q): q is Question => !!q);
  }

  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_period);
  const applyAction = applyToJob.bind(null, job.id);

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="grid gap-10 py-12 lg:grid-cols-3">
          {/* Main */}
          <div className="lg:col-span-2">
            <Link href="/jobs" className="text-sm text-stone-500 hover:text-ink">
              ← All roles
            </Link>
            <div className="mt-4 flex items-center gap-3">
              {job.employer?.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={job.employer.logo_url}
                  alt=""
                  className="h-10 w-10 rounded-[var(--radius-base)] border border-stone-200 object-cover"
                />
              )}
              <div className="flex flex-wrap items-center gap-2 text-stone-600">
                <span className="font-medium">
                  {job.employer?.company_name ?? "Company"}
                </span>
                {job.employer && (
                  <VerificationBadge level={job.employer.verification_level} kind="employer" />
                )}
                <ComplianceBadge status={employerComplianceStatus} />
                {employerMedia && (employerMedia.rating_count ?? 0) > 0 && (
                  <RatingSummary
                    avg={employerMedia.rating_avg}
                    count={employerMedia.rating_count}
                  />
                )}
              </div>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {job.title}
            </h1>

            <div className="mt-4 flex flex-wrap gap-1.5">
              <Badge>{INDUSTRY_LABEL[job.industry]}</Badge>
              <Badge>{EMPLOYMENT_TYPE_LABEL[job.employment_type]}</Badge>
              {job.shift_work && <Badge>Shift work</Badge>}
              {job.location && <Badge>{job.location}</Badge>}
              {job.experience_required > 0 && (
                <Badge>{job.experience_required}+ yrs exp</Badge>
              )}
            </div>

            <article className="mt-8 whitespace-pre-wrap text-[15px] leading-relaxed text-stone-700">
              {job.description || "No description provided."}
            </article>

            <div className="relative mt-4">
              <ReportButton contentType="job_post" contentRef={id} returnTo={`/jobs/${id}`} />
            </div>

            {job.languages_required.length > 0 && (
              <div className="mt-8">
                <p className="eyebrow mb-2">Languages</p>
                <div className="flex flex-wrap gap-1.5">
                  {job.languages_required.map((l) => (
                    <Badge key={l}>{l}</Badge>
                  ))}
                </div>
              </div>
            )}

            {employerMedia?.photos && employerMedia.photos.length > 0 && (
              <div className="mt-10">
                <p className="eyebrow mb-2">The workplace</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {employerMedia.photos.map((url: string) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url}
                      alt=""
                      className="aspect-[4/3] w-full rounded-[var(--radius-base)] border border-stone-200 object-cover"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Apply rail */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 rounded-[var(--radius-base)] border border-stone-200 p-6">
              {salary && (
                <p className="text-2xl font-semibold tracking-tight">{salary}</p>
              )}
              <p className="mt-1 text-sm text-stone-500">
                {EMPLOYMENT_TYPE_LABEL[job.employment_type]}
                {job.location ? ` · ${job.location}` : ""}
              </p>

              {/* Fit for the logged-in worker */}
              {role === "candidate" && (fit || skillCoverage) && (
                <div className="mt-5 rounded-[var(--radius-base)] bg-stone-50 p-4">
                  <p className="eyebrow mb-1">Fit for you</p>
                  {fit && (
                    <p className="text-sm font-medium text-ink">
                      {fit === "strong" ? (
                        <span className="text-signal">
                          Strong fit — your{" "}
                          {ARCHETYPES[workerArchetype as ArchetypeKey]?.name} archetype
                          suits this role
                        </span>
                      ) : (
                        "Open fit — worth a look"
                      )}
                    </p>
                  )}
                  {!workerArchetype && (
                    <p className="text-sm text-stone-500">
                      <Link href="/candidate/archetype" className="underline">
                        Find your archetype
                      </Link>{" "}
                      to see your fit.
                    </p>
                  )}
                  {skillCoverage && (
                    <p className="mt-1 text-xs text-stone-500">
                      You have {skillCoverage.have}/{skillCoverage.total} verified
                      skills for this role.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-6">
                {applied && (
                  <p className="mb-4 rounded-[var(--radius-base)] bg-stone-100 px-3 py-2 text-sm text-ink">
                    Application sent. The employer can now review your profile.
                  </p>
                )}
                {error === "not_candidate" && (
                  <p className="mb-4 rounded-[var(--radius-base)] bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    You&apos;re signed in as an employer. Switch to a candidate
                    account to apply.
                  </p>
                )}

                {!user && (
                  <ButtonLink
                    href={`/login?next=/jobs/${job.id}`}
                    className="w-full"
                    size="lg"
                  >
                    Log in to apply
                  </ButtonLink>
                )}

                {user && role === "candidate" && existingStatus && (
                  <div className="rounded-[var(--radius-base)] border border-stone-200 px-3 py-3 text-sm">
                    <p className="text-stone-500">Your application</p>
                    <p className="mt-0.5 font-medium text-ink">
                      {APPLICATION_STATUS_LABEL[
                        existingStatus as keyof typeof APPLICATION_STATUS_LABEL
                      ] ?? existingStatus}
                    </p>
                  </div>
                )}

                {user && role === "candidate" && !existingStatus && (
                  <form action={applyAction} className="space-y-3">
                    {setQuestions.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-medium text-stone-500">
                          A few quick questions from the employer:
                        </p>
                        {setQuestions.map((q, i) => (
                          <QuestionField
                            key={q.id}
                            q={q}
                            index={i + 1}
                            required={qset!.required_ids.includes(q.id)}
                          />
                        ))}
                      </div>
                    )}
                    <Textarea
                      name="cover_note"
                      placeholder="Add a short note (optional) — why you're a fit."
                      maxLength={600}
                    />
                    <button
                      type="submit"
                      className={buttonClass("primary", "lg", "w-full")}
                    >
                      {setQuestions.length > 0 ? "Submit application" : "One-click apply"}
                    </button>
                  </form>
                )}

                {user && role === "employer" && (
                  <ButtonLink href="/employer" variant="outline" className="w-full">
                    Go to employer dashboard
                  </ButtonLink>
                )}

                {user && !role && (
                  <ButtonLink href="/onboarding" className="w-full" size="lg">
                    Finish setting up to apply
                  </ButtonLink>
                )}
              </div>
            </div>
          </aside>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
