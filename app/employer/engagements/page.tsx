import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, Container, Select, buttonClass } from "@/components/ui";
import { RatingStars, ReliabilityBadge } from "@/components/Rating";
import { ReviewForm } from "@/components/ReviewForm";
import { requireRole } from "@/lib/auth";
import {
  setEngagementAttendance,
  completeEngagement,
  reviewWorker,
} from "../actions";

export const metadata: Metadata = { title: "Engagements" };

const ATTENDANCE = ["pending", "on_time", "late", "no_show"];
const ATT_LABEL: Record<string, string> = {
  pending: "Pending",
  on_time: "On time",
  late: "Late",
  no_show: "No-show",
};

export default async function EngagementsPage() {
  const { supabase, user } = await requireRole("employer", "/employer/engagements");

  const { data: engagements } = await supabase
    .from("engagements")
    .select(
      "id, role_title, status, attendance, completed_at, created_at, worker:candidate_profiles(id, full_name, headline, reliability_score, rating_avg, rating_count)",
    )
    .eq("employer_id", user.id)
    .order("created_at", { ascending: false });

  // Which engagements has this employer already reviewed?
  const { data: myReviews } = await supabase
    .from("reviews")
    .select("engagement_id, rating")
    .eq("author_id", user.id);
  const reviewed = new Map((myReviews ?? []).map((r) => [r.engagement_id, r.rating]));

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
                          <ReliabilityBadge score={w?.reliability_score ?? null} />
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
                    </div>

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
