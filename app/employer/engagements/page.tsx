import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, Container, Select, buttonClass } from "@/components/ui";
import { RatingStars, ReliabilityBadge } from "@/components/Rating";
import { ReviewForm } from "@/components/ReviewForm";
import { ReferenceForm } from "@/components/ReferenceForm";
import { requireEmployer } from "@/lib/auth";
import { SkillChip } from "@/components/SkillChip";
import {
  setEngagementAttendance,
  completeEngagement,
  reviewWorker,
  submitReference,
  verifyWorkerSkill,
  unverifyWorkerSkill,
  logRetention,
} from "../actions";
import { messageWorker } from "@/app/messages/actions";
import { RETENTION_STAGES } from "@/lib/constants";
import type { Skill } from "@/lib/types";

export const metadata: Metadata = { title: "Engagements" };

const ATTENDANCE = ["pending", "on_time", "late", "no_show"];
const ATT_LABEL: Record<string, string> = {
  pending: "Pending",
  on_time: "On time",
  late: "Late",
  no_show: "No-show",
};

export default async function EngagementsPage() {
  const { supabase, user, orgId } = await requireEmployer("/employer/engagements");

  const { data: engagements } = await supabase
    .from("engagements")
    .select(
      "id, role_title, status, attendance, completed_at, created_at, worker:candidate_profiles(id, full_name, headline, reliability_score, reputation_state, rating_avg, rating_count)",
    )
    .eq("employer_id", orgId)
    .order("created_at", { ascending: false });

  // Which engagements has this employer already reviewed?
  const { data: myReviews } = await supabase
    .from("reviews")
    .select("engagement_id, rating")
    .eq("author_id", user.id);
  const reviewed = new Map((myReviews ?? []).map((r) => [r.engagement_id, r.rating]));

  // References this employer has already left.
  const { data: myRefs } = await supabase
    .from("hire_references")
    .select("engagement_id")
    .eq("employer_id", orgId);
  const referenced = new Set((myRefs ?? []).map((r) => r.engagement_id));

  // Skill stacks for the roles in these engagements + each worker's status.
  const roleKeys = [
    ...new Set((engagements ?? []).map((e) => (e.role_title ?? "").toLowerCase()).filter(Boolean)),
  ];
  const skillsByRole = new Map<string, Skill[]>();
  if (roleKeys.length) {
    const { data: skills } = await supabase
      .from("skills")
      .select("*")
      .in("role", roleKeys)
      .order("tier", { ascending: true })
      .order("sort", { ascending: true })
      .returns<Skill[]>();
    for (const s of skills ?? []) {
      const list = skillsByRole.get(s.role) ?? [];
      list.push(s);
      skillsByRole.set(s.role, list);
    }
  }
  const workerIds = [
    ...new Set(
      (engagements ?? []).map((e) => {
        const w = Array.isArray(e.worker) ? e.worker[0] : e.worker;
        return w?.id;
      }).filter(Boolean) as string[],
    ),
  ];
  const skillStatus = new Map<string, string>(); // `${workerId}:${skillId}` -> status
  if (workerIds.length) {
    const { data: ws } = await supabase
      .from("worker_skills")
      .select("worker_id, skill_id, status")
      .in("worker_id", workerIds);
    for (const r of ws ?? []) skillStatus.set(`${r.worker_id}:${r.skill_id}`, r.status);
  }

  // Logged retention milestones (outcome events) per engagement.
  const { data: outcomeEvents } = await supabase
    .from("billing_events")
    .select("engagement_id, type")
    .eq("employer_id", orgId);
  const loggedMilestones = new Set(
    (outcomeEvents ?? []).map((e) => `${e.engagement_id}:${e.type}`),
  );

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="py-12">
          <Link href="/employer" className="text-sm text-stone-500 hover:text-ink">
            ← Dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Engagements</h1>
          <p className="mt-1 text-stone-500">
            Record who worked, mark attendance, and review them. Completed
            engagements unlock two-way reviews.
          </p>

          {engagements && engagements.length > 0 ? (
            <ul className="mt-8 space-y-3">
              {engagements.map((e) => {
                const w = Array.isArray(e.worker) ? e.worker[0] : e.worker;
                const myRating = reviewed.get(e.id);
                const roleSkills = skillsByRole.get((e.role_title ?? "").toLowerCase()) ?? [];
                const atRisk =
                  e.attendance === "no_show" ||
                  e.attendance === "late" ||
                  (w?.reliability_score ?? 100) < 70;
                return (
                  <li key={e.id} className="rounded-[var(--radius-base)] border border-stone-200 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">{w?.full_name ?? "Worker"}</p>
                        <p className="text-sm text-stone-500">
                          {e.role_title ?? "Role"}
                          {w?.headline ? ` · ${w.headline}` : ""}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <ReliabilityBadge score={w?.reliability_score ?? null} state={w?.reputation_state} />
                          {(w?.rating_count ?? 0) > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                              <RatingStars value={w!.rating_avg ?? 0} /> {w!.rating_avg?.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge tone={e.status === "completed" ? "green" : e.status === "cancelled" ? "red" : "default"}>
                        {e.status}
                      </Badge>
                    </div>

                    <div className="mt-4 flex flex-wrap items-end gap-3">
                      <form action={setEngagementAttendance.bind(null, e.id)} className="flex items-end gap-2">
                        <div>
                          <label className="mb-1 block text-xs text-stone-500">Attendance</label>
                          <Select name="attendance" defaultValue={e.attendance} className="h-9 text-sm">
                            {ATTENDANCE.map((a) => (
                              <option key={a} value={a}>{ATT_LABEL[a]}</option>
                            ))}
                          </Select>
                        </div>
                        <button className={buttonClass("outline", "sm")}>Save</button>
                      </form>

                      {e.status === "active" && (
                        <form action={completeEngagement.bind(null, e.id)}>
                          <button className={buttonClass("primary", "sm")}>Mark completed</button>
                        </form>
                      )}
                      {w && (
                        <form action={messageWorker.bind(null, w.id, undefined)}>
                          <button className={buttonClass("outline", "sm")}>Message</button>
                        </form>
                      )}
                    </div>

                    {/* Post-hire retention milestones + churn warning */}
                    {w && (
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
                        <span className="text-xs font-medium text-stone-500">Retention:</span>
                        {RETENTION_STAGES.map((m) => {
                          const logged = loggedMilestones.has(`${e.id}:${m.type}`);
                          return logged ? (
                            <span key={m.type} className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                              ✓ {m.label}
                            </span>
                          ) : (
                            <form key={m.type} action={logRetention.bind(null, e.id, m.type)}>
                              <button className="rounded-full border border-dashed border-stone-300 px-2.5 py-0.5 text-xs text-stone-500 hover:border-ink hover:text-ink">
                                + {m.label}
                              </button>
                            </form>
                          );
                        })}
                        {atRisk && (
                          <span className="ml-auto rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-medium text-danger">
                            ⚠ At risk
                          </span>
                        )}
                      </div>
                    )}

                    {/* One-tap skill verification (the linchpin) */}
                    {e.status === "completed" && w && roleSkills.length > 0 && (
                      <div className="mt-4 border-t border-stone-100 pt-4">
                        <p className="text-sm font-medium text-ink">
                          Verify {w.full_name}&apos;s skills
                        </p>
                        <p className="text-xs text-stone-500">
                          One tap each — your endorsement becomes a portable badge.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {roleSkills.map((s) => {
                            const verified =
                              skillStatus.get(`${w.id}:${s.id}`) === "employer_verified";
                            return verified ? (
                              <form key={s.id} action={unverifyWorkerSkill.bind(null, w.id, s.id)}>
                                <button title="Tap to remove" type="submit">
                                  <SkillChip name={s.name} status="employer_verified" isGate={s.is_gate} />
                                </button>
                              </form>
                            ) : (
                              <form key={s.id} action={verifyWorkerSkill.bind(null, e.id, w.id, s.id)}>
                                <button
                                  type="submit"
                                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-stone-300 px-2.5 py-0.5 text-xs font-medium text-stone-500 transition-colors hover:border-signal hover:text-signal"
                                >
                                  + {s.name}
                                  {s.is_gate && (
                                    <span className="rounded-sm bg-warning/20 px-1 text-[10px] font-semibold text-[#9a6b00]">
                                      GATE
                                    </span>
                                  )}
                                </button>
                              </form>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {e.status === "completed" && (
                      <div className="mt-4 border-t border-stone-100 pt-4">
                        {myRating ? (
                          <p className="inline-flex items-center gap-2 text-sm text-stone-600">
                            <RatingStars value={myRating} /> You reviewed this worker
                          </p>
                        ) : (
                          w && (
                            <>
                              <p className="text-sm font-medium text-ink">Review {w.full_name}</p>
                              <ReviewForm
                                action={reviewWorker.bind(null, e.id, w.id)}
                                placeholder="Reliable, great with customers…"
                              />
                            </>
                          )
                        )}

                        {/* Shared reference network */}
                        {w && (
                          <div className="mt-4">
                            {referenced.has(e.id) ? (
                              <p className="text-sm text-stone-500">
                                ✓ Reference added to the network
                              </p>
                            ) : (
                              <>
                                <p className="text-sm font-medium text-ink">
                                  Leave a reference
                                </p>
                                <p className="text-xs text-stone-500">
                                  Structured feedback other employers can see — helps
                                  everyone avoid bad hires.
                                </p>
                                <ReferenceForm
                                  action={submitReference.bind(null, e.id, w.id)}
                                />
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-8 rounded-[var(--radius-base)] border border-dashed border-stone-300 p-10 text-center text-stone-500">
              <p className="font-medium text-ink">No engagements yet.</p>
              <p className="mt-1 text-sm">
                Hire a worker from an applicant on one of your jobs to start one.
              </p>
            </div>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
