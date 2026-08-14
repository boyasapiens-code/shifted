"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Candidate saves a job for later. The saved_jobs table + RLS
 * ("saved_jobs: manage own", auth.uid() = candidate_id) already existed
 * (migration 0001) with zero application code — this is the first caller.
 * Plain server action, no client JS: revalidatePath re-renders the current
 * route with the fresh saved state, same pattern as every other form action
 * in this app (applyToJob, reportContent, ...).
 */
export async function saveJob(jobId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return; // guests never see a submittable Save control (see JobCard/job-detail)

  // Dual-role accounts can save while browsing as either side; the real
  // gate is owning a candidate_profiles row (the FK target), not the
  // profiles.active_view toggle.
  const { data: candidate } = await supabase
    .from("candidate_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!candidate) return;

  const { error } = await supabase
    .from("saved_jobs")
    .insert({ candidate_id: user.id, job_id: jobId });
  // Unique-violation (already saved) is not an error — same idempotent
  // pattern as applyToJob's duplicate-application handling.
  if (error && error.code !== "23505") return;

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/candidate/saved");
}

/** Candidate removes a job from their saved list. */
export async function unsaveJob(jobId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("saved_jobs")
    .delete()
    .eq("candidate_id", user.id)
    .eq("job_id", jobId);

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/candidate/saved");
}
