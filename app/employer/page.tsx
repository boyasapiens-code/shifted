import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, ButtonLink, Container, buttonClass } from "@/components/ui";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { VerificationBadge, VerificationLadder } from "@/components/VerificationBadge";
import { ComplianceBadge } from "@/components/ComplianceBadge";
import { RatingSummary } from "@/components/Rating";
import { requireEmployer } from "@/lib/auth";
import { complianceScore, complianceStatus } from "@/lib/compliance";
import { INDUSTRY_LABEL, isBoosted, isPaidPlan, PLAN_NAME, BOOST_PRICE } from "@/lib/constants";
import type { Industry, PlanTier } from "@/lib/types";
import { boostJob } from "./billing/actions";
import { getDict } from "@/lib/i18n";

export const metadata: Metadata = { title: "Employer dashboard" };


export default async function EmployerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const t = (await getDict()).employer;
  const STATUS_LABEL: Record<string, string> = {
    draft: t.statusDraft,
    published: t.statusLive,
    closed: t.statusClosed,
  };
  const { supabase, orgId, isOwner } = await requireEmployer("/employer");

  const { data: employer } = await supabase
    .from("employer_profiles")
    .select("*")
    .eq("id", orgId)
    .single();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, status, boosted_until, created_at, applications(count)")
    .eq("employer_id", orgId)
    .order("created_at", { ascending: false });

  const { data: staff } = await supabase
    .from("staff")
    .select("id, full_name, role_title, net_salary, currency, period")
    .eq("employer_id", orgId)
    .order("full_name", { ascending: true });

  const { count: pendingPrompts } = await supabase
    .from("verification_prompts")
    .select("*", { count: "exact", head: true })
    .eq("employer_id", orgId)
    .eq("status", "pending");
  const ratePct =
    employer?.response_rate == null ? null : Math.round(employer.response_rate * 100);

  const complianceCtx = {
    foreignHires: employer?.compliance_foreign_hires ?? false,
    headcount10Plus: employer?.compliance_headcount_10plus ?? false,
  };
  const complianceItems = employer?.compliance_items ?? [];
  const compScore = complianceScore(complianceItems, complianceCtx);
  const compStatus = complianceStatus(complianceItems, complianceCtx);

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="py-12">
          {saved && (
            <p className="mb-6 rounded-[var(--radius-base)] bg-stone-100 px-3 py-2 text-sm text-ink">
              {t.saved}
            </p>
          )}

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">{t.eyebrow}</p>
              <h1 className="mt-2 flex flex-wrap items-center gap-2 text-3xl font-semibold tracking-tight">
                {employer?.company_name}
                {employer && <VerifiedBadge status={employer.verification} />}
                {employer && isPaidPlan(employer.plan) && (
                  <Badge tone="blue">{PLAN_NAME[employer.plan as PlanTier]}</Badge>
                )}
                {employer?.featured && <Badge tone="amber">Featured</Badge>}
                {ratePct != null && ratePct >= 75 && (
                  <Badge tone="green">Responsive employer</Badge>
                )}
                {ratePct != null && ratePct < 75 && (
                  <Badge tone="red">Low responsiveness</Badge>
                )}
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
              <ButtonLink href="/employer/verify">
                {t.navVerify}{pendingPrompts ? ` (${pendingPrompts})` : ""}
              </ButtonLink>
              <ButtonLink href="/employer/billing" variant="outline">
                {employer && isPaidPlan(employer.plan) ? t.navBilling : t.navPlans}
              </ButtonLink>
              <ButtonLink href="/employer/compliance" variant="outline">
                {t.navCompliance}
              </ButtonLink>
              <ButtonLink href="/employer/trust-circle" variant="outline">
                {t.navTrustCircle}
              </ButtonLink>
              <ButtonLink href="/marketing-solutions" variant="outline">
                {t.navMarketing}
              </ButtonLink>
              <ButtonLink href="/employer/engagements" variant="outline">
                {t.navEngagements}
              </ButtonLink>
              <ButtonLink href="/employer/locations" variant="outline">
                {t.navLocations}
              </ButtonLink>
              {isOwner && (
                <ButtonLink href="/employer/team" variant="outline">
                  {t.navTeam}
                </ButtonLink>
              )}
              <ButtonLink href="/employer/profile" variant="outline">
                {t.navEditCompany}
              </ButtonLink>
              <ButtonLink href="/employer/jobs/new">{t.postJob}</ButtonLink>
            </div>
          </div>

          {/* Business verification */}
          {employer && (
            <div className="mt-6 rounded-[var(--radius-base)] border border-stone-200 bg-stone-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{t.bizVerification}</p>
                    <VerificationBadge level={employer.verification_level} kind="employer" showZero />
                  </div>
                  <p className="mt-1 text-sm text-stone-600">{t.bizVerificationSub}</p>
                </div>
                <ButtonLink href="/employer/verification" variant="outline" size="sm">
                  {employer.verification_level >= 4 ? t.viewVerification : t.getVerified}
                </ButtonLink>
              </div>
              <div className="mt-3">
                <VerificationLadder level={employer.verification_level} />
              </div>
            </div>
          )}

          {/* Hiring compliance */}
          {employer && (
            <div className="mt-4 rounded-[var(--radius-base)] border border-stone-200 bg-stone-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{t.hiringCompliance}</p>
                    <ComplianceBadge status={compStatus} />
                    {compStatus !== "ready" && (
                      <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-600">
                        {compScore.pct}%
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-stone-600">{t.hiringComplianceSub}</p>
                </div>
                <ButtonLink href="/employer/compliance" variant="outline" size="sm">
                  {compStatus === "ready" ? t.viewChecklist : t.getCompliant}
                </ButtonLink>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
                <div
                  className="h-full rounded-full bg-success"
                  style={{ width: `${compScore.pct}%` }}
                />
              </div>
            </div>
          )}

          {/* Marketing cross-sell — Booyah */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-base)] border border-stone-200 bg-ink p-5 text-paper">
            <div>
              <p className="font-medium">{t.crossSellTitle}</p>
              <p className="mt-1 text-sm text-stone-300">{t.crossSellSub}</p>
            </div>
            <ButtonLink href="/marketing-solutions" variant="primary" size="sm">
              {t.exploreMarketing}
            </ButtonLink>
          </div>

          {/* Jobs */}
          <h2 className="mt-12 text-xl font-semibold tracking-tight">{t.yourJobs}</h2>
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
                        {count} {count === 1 ? t.applicant : t.applicants}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {isBoosted(job.boosted_until) ? (
                        <Badge tone="blue">{t.promoted}</Badge>
                      ) : (
                        job.status === "published" && (
                          <form action={boostJob.bind(null, job.id)}>
                            <button className={buttonClass("ghost", "sm")}>
                              {t.boost} · ฿{BOOST_PRICE}
                            </button>
                          </form>
                        )
                      )}
                      <Badge>{STATUS_LABEL[job.status] ?? job.status}</Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-4 rounded-[var(--radius-base)] border border-dashed border-stone-300 p-10 text-center text-stone-500">
              <p className="font-medium text-ink">{t.noJobsTitle}</p>
              <p className="mt-1 text-sm">{t.noJobsSub}</p>
              <ButtonLink href="/employer/jobs/new" className="mt-4">
                {t.postJob}
              </ButtonLink>
            </div>
          )}

          {/* Team — staff/payroll records (private to the employer) */}
          {staff && staff.length > 0 && (
            <>
              <div className="mt-12 flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">{t.team}</h2>
                <span className="text-sm text-stone-500">
                  {staff.length} {staff.length === 1 ? t.person : t.people}
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
