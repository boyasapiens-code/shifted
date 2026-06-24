"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Candidate applies to a job. One-click: cover note is optional. */
export async function applyToJob(jobId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/jobs/${jobId}`);

  // Must be a candidate.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "candidate") {
    redirect(`/jobs/${jobId}?error=not_candidate`);
  }

  const coverNote = String(formData.get("cover_note") ?? "").trim() || null;

  const { error } = await supabase.from("applications").insert({
    job_id: jobId,
    candidate_id: user.id,
    cover_note: coverNote,
  });

  // Unique-violation = already applied; treat as success.
  if (error && error.code !== "23505") {
    redirect(`/jobs/${jobId}?error=apply_failed`);
  }

  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}?applied=1`);
}
