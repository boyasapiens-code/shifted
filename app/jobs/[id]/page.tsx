import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDict, getLocale } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { VerificationBadge } from "@/components/VerificationBadge";
import { VerificationExplainer } from "@/components/VerificationExplainer";
import { ComplianceBadge } from "@/components/ComplianceBadge";
import { ReportDialog } from "@/components/ReportDialog";
import { SaveJobButton } from "@/components/SaveJobButton";
import { ShareButtons } from "@/components/Marketing";
import { Disclosure } from "@/components/Disclosure";
import { JobCard } from "@/components/JobCard";
import { QuestionField } from "@/components/Interview";
import { complianceStatus } from "@/lib/compliance";
import type { Question } from "@/lib/interview";
import { RatingSummary } from "@/components/Rating";
import { Badge, ButtonLink, Container, Textarea, buttonClass, cn } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getJob, getSimilarJobs, getSavedJobIds } from "@/lib/queries";
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
import { SITE_URL } from "@/lib/site";
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

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12 21s7-6.5 7-11.5A7 7 0 105 9.5C5 14.5 12 21 12 21z" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}
function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="3" y="7.5" width="18" height="12" rx="2" />
      <path d="M8 7.5V6a2 2 0 012-2h4a2 2 0 012 2v1.5" strokeLinecap="round" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M11.6 3H5a2 2 0 00-2 2v6.6c0 .5.2 1 .6 1.4l9 9c.8.8 2 .8 2.8 0l6.6-6.6c.8-.8.8-2 0-2.8l-9-9c-.4-.4-.9-.6-1.4-.6z" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ applied?: string; error?: string; reported?: string }>;
}) {
  const { id } = await params;
  const { applied, error, reported } = await searchParams;
  const job = await getJob(id);
  if (!job) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Job-owner state: this employer is looking at their own listing. Checked
  // first and takes priority over the generic candidate/employer branches
  // below, regardless of which side the header currently shows them as —
  // owning this specific job is a fact about the job, not about whatever
  // profiles.active_view happens to be set to right now.
  const isOwner = !!user && user.id === job.employer_id;

  let role: string | null = null;
  let existingStatus: string | null = null;
  let workerArchetype: string | null = null;
  let fit: "strong" | "open" | null = null;
  let skillCoverage: { have: number; total: number } | null = null;
  let saved = false;
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

      const savedIds = await getSavedJobIds(user.id);
      saved = savedIds.has(job.id);
    }
  }

  // Employer workplace media + reputation (public) — `description` was
  // already being fetched here but never actually rendered anywhere; now
  // backs the new "About the employer" section instead of being dead data.
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

  const [dict, locale, similarJobs] = await Promise.all([
    getDict(),
    getLocale(),
    getSimilarJobs(job.industry, job.id, 3),
  ]);
  const t = dict.jobDetail;
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_period, locale);
  const applyAction = applyToJob.bind(null, job.id);
  const canApplyDirect = user && role === "candidate" && !existingStatus;
  const canSave = role === "candidate";
  const jobUrl = `${SITE_URL}/jobs/${id}`;

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="grid gap-10 pb-28 pt-12 lg:grid-cols-3 lg:pb-12">
          {/* Main */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <Link href="/jobs" className="text-sm text-stone-500 hover:text-ink">
                {t.allRoles}
              </Link>
              <div className="flex items-center gap-1">
                {canSave && (
                  <SaveJobButton jobId={id} saved={saved} saveLabel={t.save} savedLabel={t.saved} />
                )}
                <Disclosure
                  triggerLabel={t.more}
                  triggerContent={<span aria-hidden="true">⋯</span>}
                  triggerClassName="text-stone-400 hover:text-ink"
                  // Default closeOnInnerClick would fire on the same click
                  // that opens ReportDialog's <dialog> (showModal()) — and
                  // since that dialog is a DOM descendant of this panel,
                  // the panel's own hidden={true} on close pulls the
                  // (still-open) dialog out of the top layer with it, so
                  // it never visually appears. Caught live: click did
                  // nothing. false here leaves the "⋯" panel open behind
                  // the modal; the dialog's own Escape/backdrop/Cancel
                  // handles its own close independently.
                  closeOnInnerClick={false}
                >
                  <div className="flex flex-col gap-1 p-1">
                    <ReportDialog
                      contentType="job_post"
                      contentRef={id}
                      returnTo={`/jobs/${id}`}
                      t={{
                        reportJob: t.reportJob,
                        reportDialogTitle: t.reportDialogTitle,
                        reportReasonLabel: t.reportReasonLabel,
                        reportReasons: t.reportReasons,
                        reportDetailLabel: t.reportDetailLabel,
                        reportDetailPlaceholder: t.reportDetailPlaceholder,
                        reportConfidential: t.reportConfidential,
                        reportCancel: t.reportCancel,
                        reportSubmit: t.reportSubmit,
                      }}
                    />
                  </div>
                </Disclosure>
              </div>
            </div>

            {reported === "1" && (
              <p className="mt-3 rounded-[var(--radius-base)] bg-stone-100 px-3 py-2 text-sm text-ink">
                {t.reportSuccess}
              </p>
            )}
            {reported === "busy" && (
              <p className="mt-3 rounded-[var(--radius-base)] bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {t.reportBusy}
              </p>
            )}

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
                  <>
                    <VerificationBadge level={job.employer.verification_level} kind="employer" />
                    <VerificationExplainer kind="employer" level={job.employer.verification_level} t={{ ...dict.verification, verificationExplainer: t.verificationExplainer, verificationWhatChecked: t.verificationWhatChecked, verificationNotGuarantee: t.verificationNotGuarantee }} />
                  </>
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

            {isOwner && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-signal/10 px-3 py-1 text-xs font-semibold text-signal">
                {t.youOwnThisListing}
              </p>
            )}

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {job.title}
            </h1>

            {salary && <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{salary}</p>}

            {/* Quiet metadata — icons + text. Verification/compliance above
                stay badges (they're the two things that matter most); this
                row is ordinary detail, not a pill wall. */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-stone-500">
              <span className="inline-flex items-center gap-1.5">
                <TagIcon />
                {INDUSTRY_LABEL[job.industry]}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BriefcaseIcon />
                {EMPLOYMENT_TYPE_LABEL[job.employment_type]}
              </span>
              {job.shift_work && (
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon />
                  {t.shiftWork}
                </span>
              )}
              {job.location && (
                <span className="inline-flex items-center gap-1.5">
                  <PinIcon />
                  {job.location}
                </span>
              )}
              {job.experience_required > 0 && (
                <span>{t.experienceRequired(job.experience_required)}</span>
              )}
            </div>

            <div className="mt-2">
              <ShareButtons url={jobUrl} title={job.title} />
            </div>

            {/* เกี่ยวกับงาน — About the role */}
            <section className="mt-8">
              <h2 className="text-lg font-semibold tracking-tight">{t.aboutRole}</h2>
              <article className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-stone-700">
                {job.description || t.noDescription}
              </article>
            </section>

            {/* ตารางและสถานที่ทำงาน — Schedule & workplace */}
            <section className="mt-8">
              <h2 className="text-lg font-semibold tracking-tight">{t.scheduleWorkplace}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-stone-600">
                <span className="inline-flex items-center gap-1.5">
                  <BriefcaseIcon />
                  {EMPLOYMENT_TYPE_LABEL[job.employment_type]}
                </span>
                {job.shift_work && (
                  <span className="inline-flex items-center gap-1.5">
                    <ClockIcon />
                    {t.shiftWork}
                  </span>
                )}
                {job.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <PinIcon />
                    {job.location}
                  </span>
                )}
              </div>
            </section>

            {/* เงินเดือนและสวัสดิการ — Salary & benefits. Only real fields
                (salary_min/max/period) — no separate "benefits" data
                exists, so this section never claims one; see NOTES.md. */}
            <section className="mt-8">
              <h2 className="text-lg font-semibold tracking-tight">{t.salaryBenefits}</h2>
              <p className="mt-2 text-sm text-stone-600">
                {salary ?? t.salaryNotSpecified}
              </p>
            </section>

            {job.languages_required.length > 0 && (
              <section className="mt-8">
                <h2 className="text-lg font-semibold tracking-tight">{t.languages}</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {job.languages_required.map((l) => (
                    <Badge key={l}>{l}</Badge>
                  ))}
                </div>
              </section>
            )}

            {/* เกี่ยวกับนายจ้าง — About the employer */}
            {(employerMedia?.description || (employerMedia?.photos?.length ?? 0) > 0) && (
              <section className="mt-8">
                <h2 className="text-lg font-semibold tracking-tight">{t.aboutEmployer}</h2>
                {employerMedia?.description && (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-600">
                    {employerMedia.description}
                  </p>
                )}
                {employerMedia?.photos && employerMedia.photos.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                )}
              </section>
            )}

            {similarJobs.length > 0 && (
              <section className="mt-10 border-t border-stone-100 pt-8">
                <h2 className="text-lg font-semibold tracking-tight">{t.similarJobs}</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {similarJobs.map((sj) => (
                    <JobCard key={sj.id} job={sj} locale={locale} t={dict} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Apply rail — sticky on desktop; on mobile this is the anchor
              target the fixed bottom bar (below) scrolls/links to, so it
              still needs to actually render in normal flow, not be hidden. */}
          <aside id="apply-panel" className="lg:col-span-1">
            <div className="rounded-[var(--radius-base)] border border-stone-200 p-6 lg:sticky lg:top-24">
              {isOwner ? (
                <>
                  <p className="text-sm font-medium text-ink">{t.youOwnThisListing}</p>
                  <ButtonLink href={`/employer/jobs/${job.id}`} className="mt-3 w-full" size="lg">
                    {t.manageListing}
                  </ButtonLink>
                </>
              ) : (
                <>
                  {/* Fit for the logged-in worker */}
                  {role === "candidate" && (fit || skillCoverage) && (
                    <div className="mb-5 rounded-[var(--radius-base)] bg-stone-50 p-4">
                      <p className="eyebrow mb-1">{t.fitForYou}</p>
                      {fit && (
                        <p className="text-sm font-medium text-ink">
                          {fit === "strong" ? (
                            <span className="text-signal">
                              {t.strongFitPrefix}{" "}
                              {ARCHETYPES[workerArchetype as ArchetypeKey]?.name}{" "}
                              {t.strongFitSuffix}
                            </span>
                          ) : (
                            t.openFit
                          )}
                        </p>
                      )}
                      {!workerArchetype && (
                        <p className="text-sm text-stone-500">
                          <Link href="/candidate/archetype" className="underline">
                            {t.findArchetype}
                          </Link>{" "}
                          {t.findArchetypeSuffix}
                        </p>
                      )}
                      {skillCoverage && (
                        <p className="mt-1 text-xs text-stone-500">
                          {t.skillsCoverage} {skillCoverage.have}/{skillCoverage.total}{" "}
                          {t.skillsCoverageSuffix}
                        </p>
                      )}
                    </div>
                  )}

                  {applied && (
                    <p className="mb-4 rounded-[var(--radius-base)] bg-stone-100 px-3 py-2 text-sm text-ink">
                      {t.applied}
                    </p>
                  )}
                  {error === "not_candidate" && (
                    <p className="mb-4 rounded-[var(--radius-base)] bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      {t.errorNotCandidate}
                    </p>
                  )}
                  {error === "rate_limited" && (
                    <p className="mb-4 rounded-[var(--radius-base)] bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      {t.errorRateLimited}
                    </p>
                  )}
                  {error === "apply_failed" && (
                    <p className="mb-4 rounded-[var(--radius-base)] bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      {t.errorGeneric}
                    </p>
                  )}

                  {!user && (
                    <ButtonLink href={`/login?next=/jobs/${job.id}`} className="w-full" size="lg">
                      {t.loginToApply}
                    </ButtonLink>
                  )}

                  {user && role === "candidate" && existingStatus && (
                    <div className="rounded-[var(--radius-base)] border border-stone-200 px-3 py-3 text-sm">
                      <p className="text-stone-500">{t.yourApplication}</p>
                      <p className="mt-0.5 font-medium text-ink">
                        {APPLICATION_STATUS_LABEL[
                          existingStatus as keyof typeof APPLICATION_STATUS_LABEL
                        ] ?? existingStatus}
                      </p>
                    </div>
                  )}

                  {canApplyDirect && (
                    <form action={applyAction} className="space-y-3">
                      {setQuestions.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-stone-500">
                            {t.screeningIntro}
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
                        placeholder={t.coverNotePlaceholder}
                        maxLength={600}
                      />
                      <button type="submit" className={buttonClass("primary", "lg", "w-full")}>
                        {setQuestions.length > 0 ? t.submitApplication : t.oneClickApply}
                      </button>
                    </form>
                  )}

                  {user && role === "employer" && !isOwner && (
                    <ButtonLink href="/employer" variant="outline" className="w-full">
                      {t.goToEmployer}
                    </ButtonLink>
                  )}

                  {user && !role && (
                    <ButtonLink href="/onboarding" className="w-full" size="lg">
                      {t.finishSetup}
                    </ButtonLink>
                  )}
                </>
              )}
            </div>
          </aside>
        </Container>
      </main>
      <SiteFooter />

      {/* Mobile sticky application bar — the desktop aside above already
          renders in normal flow on small screens (it has to: an anchor
          link can't scroll to a display:none target), just far down the
          page past the description/sections. This bar keeps the primary
          action one tap away regardless of scroll position. Simple states
          (guest/owner/applied/employer/no-role) get the real action
          inline; the actual "apply with questions" form only exists once,
          in the panel above — this jumps there rather than duplicating it
          into a space too small for a real form. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-paper/95 p-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          {salary && <span className="flex-1 truncate text-sm font-semibold text-ink">{salary}</span>}
          {isOwner ? (
            <ButtonLink href={`/employer/jobs/${job.id}`} className="flex-1">
              {t.manageListing}
            </ButtonLink>
          ) : !user ? (
            <ButtonLink href={`/login?next=/jobs/${job.id}`} className="flex-1">
              {t.loginToApply}
            </ButtonLink>
          ) : role === "candidate" && existingStatus ? (
            <span className={cn(buttonClass("outline", "md"), "flex-1 cursor-default")}>
              {APPLICATION_STATUS_LABEL[existingStatus as keyof typeof APPLICATION_STATUS_LABEL] ?? existingStatus}
            </span>
          ) : canApplyDirect ? (
            <Link href="#apply-panel" className={cn(buttonClass("primary", "md"), "flex-1")}>
              {setQuestions.length > 0 ? t.submitApplication : t.oneClickApply}
            </Link>
          ) : role === "employer" && !isOwner ? (
            <ButtonLink href="/employer" variant="outline" className="flex-1">
              {t.goToEmployer}
            </ButtonLink>
          ) : (
            <ButtonLink href="/onboarding" className="flex-1">
              {t.finishSetup}
            </ButtonLink>
          )}
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "JobPosting",
            title: job.title,
            description: job.description || undefined,
            hiringOrganization: job.employer?.company_name
              ? { "@type": "Organization", name: job.employer.company_name }
              : undefined,
            employmentType: job.employment_type,
            jobLocation: job.location
              ? { "@type": "Place", address: job.location }
              : undefined,
            datePosted: job.published_at ?? undefined,
          }),
        }}
      />
    </>
  );
}
