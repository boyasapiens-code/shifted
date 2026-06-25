"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus, EmploymentType, Industry } from "@/lib/types";
import { OUTCOME_PRICING } from "@/lib/constants";
import { moderateComment } from "@/lib/moderation";

function toList(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function numOrNull(value: FormDataEntryValue | null): number | null {
  const n = Number(value);
  return value === null || value === "" || Number.isNaN(n) ? null : n;
}

async function requireEmployer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/employer");
  return { supabase, user };
}

export async function updateEmployerProfile(formData: FormData) {
  const { supabase, user } = await requireEmployer();

  await supabase
    .from("employer_profiles")
    .update({
      company_name: String(formData.get("company_name") ?? "").trim(),
      industry: (String(formData.get("industry") ?? "other") as Industry) || "other",
      description: String(formData.get("description") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      website: String(formData.get("website") ?? "").trim() || null,
      business_registered: formData.get("business_registered") === "on",
      salary_transparency: formData.get("salary_transparency") === "on",
    })
    .eq("id", user.id);

  revalidatePath("/employer");
  redirect("/employer?saved=1");
}

export async function createJob(formData: FormData) {
  const { supabase, user } = await requireEmployer();

  const publish = formData.get("publish") === "1";
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      employer_id: user.id,
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      industry: (String(formData.get("industry") ?? "other") as Industry) || "other",
      location: String(formData.get("location") ?? "").trim() || null,
      employment_type:
        (String(formData.get("employment_type") ?? "full_time") as EmploymentType) ||
        "full_time",
      shift_work: formData.get("shift_work") === "on",
      salary_min: numOrNull(formData.get("salary_min")),
      salary_max: numOrNull(formData.get("salary_max")),
      salary_period: String(formData.get("salary_period") ?? "month"),
      languages_required: toList(formData.get("languages_required")),
      experience_required: numOrNull(formData.get("experience_required")) ?? 0,
      status: publish ? "published" : "draft",
      published_at: publish ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) redirect("/employer/jobs/new?error=1");
  revalidatePath("/employer");
  redirect(`/employer/jobs/${data!.id}`);
}

/** Publish / close an existing job. */
export async function setJobStatus(jobId: string, status: "published" | "closed" | "draft") {
  const { supabase, user } = await requireEmployer();
  await supabase
    .from("jobs")
    .update({
      status,
      published_at: status === "published" ? new Date().toISOString() : undefined,
    })
    .eq("id", jobId)
    .eq("employer_id", user.id);
  revalidatePath(`/employer/jobs/${jobId}`);
  revalidatePath("/employer");
}

// --- Reputation: engagements + reviewing workers --------------------------

/** Start an engagement (hire) for a worker on one of the employer's jobs. */
export async function startEngagement(jobId: string, workerId: string) {
  const { supabase, user } = await requireEmployer();
  const { data: job } = await supabase
    .from("jobs")
    .select("title")
    .eq("id", jobId)
    .eq("employer_id", user.id)
    .single();

  const { data: eng, error } = await supabase
    .from("engagements")
    .insert({
      employer_id: user.id,
      worker_id: workerId,
      job_id: jobId,
      role_title: job?.title ?? null,
      status: "active",
    })
    .select("id")
    .single();
  // 23505 = already engaged for this job; treat as success.
  if (error && error.code !== "23505") {
    redirect(`/employer/jobs/${jobId}?error=engage_failed`);
  }

  // Outcome-aligned billing: a confirmed hire is a billable event.
  if (eng) {
    await supabase.from("billing_events").upsert(
      {
        employer_id: user.id,
        worker_id: workerId,
        engagement_id: eng.id,
        type: "hire_confirmed",
        amount_thb: OUTCOME_PRICING.hire_confirmed.amount,
      },
      { onConflict: "engagement_id,type", ignoreDuplicates: true },
    );
  }

  revalidatePath(`/employer/jobs/${jobId}`);
  revalidatePath("/employer/engagements");
}

/** Log a retention milestone (worker stayed to day 30/60/90) → outcome event. */
export async function logRetention(engagementId: string, type: string) {
  const { supabase, user } = await requireEmployer();
  if (!OUTCOME_PRICING[type]) return;
  const { data: eng } = await supabase
    .from("engagements")
    .select("worker_id")
    .eq("id", engagementId)
    .eq("employer_id", user.id)
    .single();
  if (!eng) return;
  await supabase.from("billing_events").upsert(
    {
      employer_id: user.id,
      worker_id: eng.worker_id,
      engagement_id: engagementId,
      type,
      amount_thb: OUTCOME_PRICING[type].amount,
    },
    { onConflict: "engagement_id,type", ignoreDuplicates: true },
  );
  revalidatePath("/employer/engagements");
  revalidatePath("/employer/billing");
}

/** Set attendance signal on an engagement (form action: reads `attendance`). */
export async function setEngagementAttendance(engagementId: string, formData: FormData) {
  const { supabase, user } = await requireEmployer();
  await supabase
    .from("engagements")
    .update({ attendance: String(formData.get("attendance") ?? "pending") })
    .eq("id", engagementId)
    .eq("employer_id", user.id);
  revalidatePath("/employer/engagements");
}

/** Mark an engagement completed — unlocks reviews and generates skill-verification
 *  prompts (the "shift end" trigger). Auto-provable badges self-confirm; manual
 *  milestone badges become pending one-tap prompts. */
export async function completeEngagement(engagementId: string) {
  const { supabase, user } = await requireEmployer();
  const now = new Date().toISOString();

  const { data: eng } = await supabase
    .from("engagements")
    .update({ status: "completed", completed_at: now })
    .eq("id", engagementId)
    .eq("employer_id", user.id)
    .select("worker_id, role_title")
    .single();

  if (eng?.role_title) {
    const role = eng.role_title.toLowerCase();
    // Badge skills for this role that need verification.
    const { data: badgeSkills } = await supabase
      .from("skills")
      .select("id, badge_name, verify_method")
      .eq("role", role)
      .not("badge_name", "is", null)
      .in("verify_method", ["manual", "auto"]);

    // Only prompt for skills the worker has actually claimed (and not yet earned).
    const { data: claimed } = await supabase
      .from("worker_skills")
      .select("skill_id, status")
      .eq("worker_id", eng.worker_id);
    const claimedStatus = new Map((claimed ?? []).map((c) => [c.skill_id, c.status]));

    for (const s of badgeSkills ?? []) {
      const st = claimedStatus.get(s.id);
      if (st !== "self_declared") continue; // not claimed, or already verified
      if (s.verify_method === "auto") {
        await supabase.from("verification_prompts").upsert(
          { worker_id: eng.worker_id, employer_id: user.id, skill_id: s.id, engagement_id: engagementId, badge_type: s.badge_name, method: "auto_pos", status: "confirmed", manager_id: user.id, responded_at: now },
          { onConflict: "engagement_id,skill_id", ignoreDuplicates: true },
        );
        await supabase.from("worker_skills").upsert(
          { worker_id: eng.worker_id, skill_id: s.id, status: "employer_verified", verified_by: user.id, engagement_id: engagementId, verified_at: now },
          { onConflict: "worker_id,skill_id" },
        );
      } else {
        await supabase.from("verification_prompts").upsert(
          { worker_id: eng.worker_id, employer_id: user.id, skill_id: s.id, engagement_id: engagementId, badge_type: s.badge_name, method: "manual", status: "pending" },
          { onConflict: "engagement_id,skill_id", ignoreDuplicates: true },
        );
      }
    }
  }

  revalidatePath("/employer/engagements");
  revalidatePath("/employer/verify");
  revalidatePath("/employer");
}

/** Employer reviews a worker for a completed engagement (form action). */
export async function reviewWorker(
  engagementId: string,
  workerId: string,
  formData: FormData,
) {
  const { supabase, user } = await requireEmployer();
  const rating = Math.max(1, Math.min(5, Number(formData.get("rating") ?? 0)));
  // Moderate the free-text comment before it's stored (Thai-law + policy gates).
  const mod = await moderateComment(
    String(formData.get("comment") ?? ""),
    { contentType: "review", authorId: user.id, targetId: workerId },
    supabase,
  );
  await supabase.from("reviews").upsert(
    {
      engagement_id: engagementId,
      author_id: user.id,
      subject_id: workerId,
      kind: "of_worker",
      rating,
      comment: mod.comment,
      comment_status: mod.status,
    },
    { onConflict: "engagement_id,author_id" },
  );
  revalidatePath("/employer/engagements");
  if (mod.action !== "ALLOW") redirect(`/employer/engagements?moderation=${mod.action.toLowerCase()}`);
}

/** One-tap: endorse a worker's skill from a completed engagement (the linchpin). */
export async function verifyWorkerSkill(
  engagementId: string,
  workerId: string,
  skillId: string,
) {
  const { supabase, user } = await requireEmployer();
  await supabase.from("worker_skills").upsert(
    {
      worker_id: workerId,
      skill_id: skillId,
      status: "employer_verified",
      verified_by: user.id,
      engagement_id: engagementId,
      verified_at: new Date().toISOString(),
    },
    { onConflict: "worker_id,skill_id" },
  );
  revalidatePath("/employer/engagements");
}

/** Remove an endorsement (in case of a mistap). */
export async function unverifyWorkerSkill(workerId: string, skillId: string) {
  const { supabase, user } = await requireEmployer();
  await supabase
    .from("worker_skills")
    .delete()
    .eq("worker_id", workerId)
    .eq("skill_id", skillId)
    .eq("verified_by", user.id);
  revalidatePath("/employer/engagements");
}

/** Leave a structured reference on a worker (shared reference network). */
export async function submitReference(
  engagementId: string,
  workerId: string,
  formData: FormData,
) {
  const { supabase, user } = await requireEmployer();
  const reliability = Math.max(1, Math.min(5, Number(formData.get("reliability") ?? 0)));
  await supabase.from("hire_references").upsert(
    {
      engagement_id: engagementId,
      worker_id: workerId,
      employer_id: user.id,
      reliability,
      would_rehire: formData.get("would_rehire") === "on",
      no_show: formData.get("no_show") === "on",
      conduct_note: String(formData.get("conduct_note") ?? "").trim() || null,
    },
    { onConflict: "engagement_id,employer_id" },
  );
  revalidatePath("/employer/engagements");
}

/** Move an applicant through the pipeline (form action: reads `status`). */
export async function setApplicationStatus(
  applicationId: string,
  jobId: string,
  formData: FormData,
) {
  const { supabase } = await requireEmployer();
  const status = String(formData.get("status") ?? "") as ApplicationStatus;
  // RLS ensures only the owning employer can update applications to their jobs.
  await supabase.from("applications").update({ status }).eq("id", applicationId);
  revalidatePath(`/employer/jobs/${jobId}`);
}
