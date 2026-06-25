"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MIN_QUESTIONS, MAX_QUESTIONS, MAX_REQUIRED } from "@/lib/interview";

async function ownerOrRedirect(jobId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/employer/jobs/${jobId}/questions`);
  const { data: job } = await supabase
    .from("jobs")
    .select("id, employer_id")
    .eq("id", jobId)
    .maybeSingle();
  if (!job || job.employer_id !== user.id) redirect("/employer");
  return { supabase, user };
}

/** Save the closed-bank question set for a job. */
export async function saveQuestionSet(jobId: string, formData: FormData) {
  const { supabase } = await ownerOrRedirect(jobId);
  const base = `/employer/jobs/${jobId}/questions`;

  const included = formData.getAll("include").map(String);
  const required = formData.getAll("required").map(String).filter((id) => included.includes(id));
  const scoring_mode = String(formData.get("scoring_mode") ?? "attach");

  if (included.length < MIN_QUESTIONS || included.length > MAX_QUESTIONS) {
    redirect(`${base}?error=count`);
  }
  if (required.length > MAX_REQUIRED) {
    redirect(`${base}?error=required`);
  }

  await supabase.from("question_sets").upsert(
    { job_id: jobId, question_ids: included, required_ids: required, scoring_mode },
    { onConflict: "job_id" },
  );
  revalidatePath(base);
  redirect(`${base}?saved=1`);
}

/** Suggest a new question to Shifted's review queue (joins the global bank if approved). */
export async function requestQuestion(jobId: string, formData: FormData) {
  const { supabase, user } = await ownerOrRedirect(jobId);
  const prompt = String(formData.get("prompt") ?? "").trim();
  if (!prompt) redirect(`/employer/jobs/${jobId}/questions`);

  await supabase.from("questions").insert({
    role_scope: [String(formData.get("role") ?? "all")],
    category: String(formData.get("category") ?? "skills"),
    prompt,
    answer_format: String(formData.get("answer_format") ?? "single_select"),
    options: [],
    is_global: false,
    status: "pending_review",
    suggested_by: user.id,
  });
  redirect(`/employer/jobs/${jobId}/questions?requested=1`);
}
