import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, ButtonLink, Container } from "@/components/ui";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { RatingSummary, RatingStars, ReliabilityBadge } from "@/components/Rating";
import { VerificationBadge, VerificationLadder } from "@/components/VerificationBadge";
import { ReviewForm } from "@/components/ReviewForm";
import { requireWorker } from "@/lib/auth";
import { APPLICATION_STATUS_LABEL } from "@/lib/constants";
import { reviewEmployer } from "./actions";
import { messageEmployer } from "@/app/messages/actions";
import { ARCHETYPES, type ArchetypeKey } from "@/lib/archetypes";

export const metadata: Metadata = { title: "Your dashboard" };

export default async function CandidateDashboard({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const { supabase, user, profile } = await requireWorker("/candidate");

  const { data: candidate } = await supabase
    .from("candidate_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: applications } = await supabase
    .from("applications")
    .select(
      "id, status, created_at, job:jobs(id, title, employer:employer_profiles(id, company_name, verification))",
    )
    .eq("candidate_id", user.id)
    .order("created_at", { ascending: false });

  // Work history (engagements) + which the worker has already reviewed.
  const { data: engagements } = await supabase
    .from("engagements")
    .select(
      "id, role_title, status, attendance, created_at, employer:employer_profiles(id, company_name, verification)",
    )
    .eq("worker_id", user.id)
    .order("created_at", { ascending: false });
  const { data: myReviews } = await supabase
    .from("reviews")
    .select("engagement_id, rating")
    .eq("author_id", user.id);
  const reviewedEng = new Map((myReviews ?? []).map((r) => [r.engagement_id, r.rating]));

  // Employer-verified skill badges.
  const { data: verifiedSkills } = await supabase
    .from("worker_skills")
    .select("skill:skills(badge_name)")
    .eq("worker_id", user.id)
    .eq("status", "employer_verified");
  const skillBadges = (verifiedSkills ?? [])
    .map((r) => {
      const s = Array.isArray(r.skill) ? r.skill[0] : r.skill;
      return s?.badge_name;
    })
    .filter(Boolean) as string[];
  const verifiedSkillCount = verifiedSkills?.length ?? 0;

  // Lightweight profile completeness signal.
  const checks = [
    !!profile.full_name,
    !!candidate?.headline,
    !!candidate?.location,
    (candidate?.skills?.length ?? 0) > 0,
    (candidate?.languages?.length ?? 0) > 0,
  ];
  const complete = Math.round(
    (checks.filter(Boolean).length / checks.length) * 100,
  );

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="py-12">
          {saved && (
            <p className="mb-6 rounded-[var(--radius-base)] bg-stone-100 px-3 py-2 text-sm text-ink">
              Profile saved.
            </p>
          )}
          <p className="eyebrow">Candidate</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {profile.full_name ? `Hi, ${profile.full_name.split(" ")[0]}` : "Your dashboard"}
          </h1>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {/* Profile card */}
            <section className="rounded-[var(--radius-base)] border border-stone-200 p-6">
              <div className="mb-4 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.avatar_url ?? "/avatar-placeholder.svg"}
                  alt=""
                  className="h-12 w-12 rounded-full border border-stone-200 bg-stone-100 object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">
                    {profile.full_name ?? "Your profile"}
                  </p>
                  <p className="truncate text-sm text-stone-500">
                    {candidate?.location ?? "Add your location"}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Profile</h2>
                <span className="text-sm text-stone-500">{complete}% complete</span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full bg-ink transition-all"
                  style={{ width: `${complete}%` }}
                />
              </div>
              <p className="mt-4 text-sm text-stone-600">
                {candidate?.headline || "Add a headline so employers know your craft."}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <RatingSummary avg={candidate?.rating_avg ?? null} count={candidate?.rating_count ?? 0} />
                <ReliabilityBadge score={candidate?.reliability_score ?? null} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {candidate?.open_to_work && <Badge>Open to work</Badge>}
                {candidate?.location && <Badge>{candidate.location}</Badge>}
              </div>

              {/* Verification */}
              <div className="mt-5 rounded-[var(--radius-base)] bg-stone-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">Verification</span>
                  <VerificationBadge level={candidate?.verification_level ?? 0} showZero />
                </div>
                <div className="mt-2">
                  <VerificationLadder level={candidate?.verification_level ?? 0} />
                </div>
                <ButtonLink href="/candidate/verification" size="sm" className="mt-3 w-full">
                  {(candidate?.verification_level ?? 0) >= 4 ? "View verification" : "Get verified →"}
                </ButtonLink>
              </div>

              {/* Archetype */}
              <div className="mt-3 rounded-[var(--radius-base)] bg-stone-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">Archetype</span>
                  {candidate?.archetype && (
                    <span className="text-xs font-medium text-signal">
                      {ARCHETYPES[candidate.archetype as ArchetypeKey]?.tagline}
                    </span>
                  )}
                </div>
                {candidate?.archetype ? (
                  <p className="mt-1 text-lg font-semibold tracking-tight text-ink">
                    {ARCHETYPES[candidate.archetype as ArchetypeKey]?.name}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-stone-500">
                    Take the 2-minute assessment to find your fit.
                  </p>
                )}
                <ButtonLink
                  href="/candidate/archetype"
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                >
                  {candidate?.archetype ? "Retake assessment" : "Find your archetype →"}
                </ButtonLink>
              </div>

              {/* Skills & badges */}
              <div className="mt-3 rounded-[var(--radius-base)] bg-stone-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">Skills &amp; badges</span>
                  <span className="text-xs text-stone-500">
                    {verifiedSkillCount} verified
                  </span>
                </div>
                {skillBadges.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {skillBadges.slice(0, 4).map((b) => (
                      <span key={b} className="rounded-full bg-signal/10 px-2 py-0.5 text-xs font-semibold text-signal">
                        {b}
                      </span>
                    ))}
                  </div>
                )}
                <ButtonLink href="/candidate/skills" size="sm" className="mt-3 w-full">
                  {verifiedSkillCount > 0 ? "View skills" : "Build your skills →"}
                </ButtonLink>
              </div>

              <ButtonLink
                href="/candidate/profile"
                variant="outline"
                size="sm"
                className="mt-3 w-full"
              >
                Edit profile
              </ButtonLink>
            </section>

            {/* Applications */}
            <section className="rounded-[var(--radius-base)] border border-stone-200 p-6 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Applications</h2>
                <Link href="/jobs" className="text-sm font-medium text-ink underline">
                  Browse jobs
                </Link>
              </div>

              {applications && applications.length > 0 ? (
                <ul className="mt-4 divide-y divide-stone-100">
                  {applications.map((app) => {
                    // Supabase returns joined relations as arrays or objects.
                    const job = Array.isArray(app.job) ? app.job[0] : app.job;
                    const employer = job
                      ? Array.isArray(job.employer)
                        ? job.employer[0]
                        : job.employer
                      : null;
                    return (
                      <li
                        key={app.id}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0">
                          <Link
                            href={job ? `/jobs/${job.id}` : "#"}
                            className="font-medium text-ink hover:underline"
                          >
                            {job?.title ?? "Role"}
                          </Link>
                          <p className="flex items-center gap-1 text-sm text-stone-500">
                            {employer?.company_name}
                            {employer && (
                              <VerifiedBadge status={employer.verification} />
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge>
                            {APPLICATION_STATUS_LABEL[
                              app.status as keyof typeof APPLICATION_STATUS_LABEL
                            ] ?? app.status}
                          </Badge>
                          {employer && (
                            <form action={messageEmployer.bind(null, employer.id, job?.id)}>
                              <button className="text-xs font-medium text-ink underline">
                                Message
                              </button>
                            </form>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="mt-4 rounded-[var(--radius-base)] border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
                  No applications yet.{" "}
                  <Link href="/jobs" className="underline">
                    Find your next shift
                  </Link>
                  .
                </div>
              )}
            </section>
          </div>

          {/* Work history — verified engagements + review the employer */}
          {engagements && engagements.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold tracking-tight">Work history</h2>
              <p className="mt-1 text-sm text-stone-500">
                Verified shifts you completed through SHIFTED. This is what builds
                your reliability.
              </p>
              <ul className="mt-4 space-y-3">
                {engagements.map((e) => {
                  const emp = Array.isArray(e.employer) ? e.employer[0] : e.employer;
                  const myRating = reviewedEng.get(e.id);
                  return (
                    <li key={e.id} className="rounded-[var(--radius-base)] border border-stone-200 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="flex items-center gap-1 font-semibold text-ink">
                            {emp?.company_name ?? "Employer"}
                            {emp && <VerifiedBadge status={emp.verification} />}
                          </p>
                          <p className="text-sm text-stone-500">{e.role_title ?? "Role"}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge tone={e.status === "completed" ? "green" : "default"}>{e.status}</Badge>
                          {emp && (
                            <form action={messageEmployer.bind(null, emp.id, undefined)}>
                              <button className="text-xs font-medium text-ink underline">
                                Message
                              </button>
                            </form>
                          )}
                        </div>
                      </div>

                      {e.status === "completed" && (
                        <div className="mt-3 border-t border-stone-100 pt-3">
                          {myRating ? (
                            <p className="inline-flex items-center gap-2 text-sm text-stone-600">
                              <RatingStars value={myRating} /> You reviewed this employer
                            </p>
                          ) : (
                            emp && (
                              <>
                                <p className="text-sm font-medium text-ink">Review {emp.company_name}</p>
                                <ReviewForm
                                  action={reviewEmployer.bind(null, e.id, emp.id)}
                                  placeholder="Fair pay, good management, clear shifts…"
                                />
                              </>
                            )
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
