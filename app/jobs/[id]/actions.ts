"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { scoreApplication, answerPoints, type Question } from "@/lib/interview";
import { rateLimit } from "@/lib/ratelimit";
import { notifyNewApplication } from "@/lib/notify";

/** Candidate applies to a job. If the job has a question set, answers are
 *  required, scored, and knockouts evaluated at submit. */
export async function applyToJob(jobId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/jobs/${jobId}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "candidate") {
    redirect(`/jobs/${jobId}?error=not_candidate`);
  }

  // Throttle applies to blunt scripted spam (the worker side we protect most).
  if (!(await rateLimit(supabase, `apply:${user.id}`, 20, 3600))) {
    redirect(`/jobs/${jobId}?error=rate_limited`);
  }

  // Job owner + title, for the "new applicant" notification.
  const { data: job } = await supabase
    .from("jobs")
    .select("employer_id, title")
    .eq("id", jobId)
    .single();

  const coverNote = String(formData.get("cover_note") ?? "").trim() || null;

  // Closed-bank screening questions (if the employer attached a set).
  const { data: qset } = await supabase
    .from("question_sets")
    .select("*")
    .eq("job_id", jobId)
    .maybeSingle();

  let score: number | null = null;
  let knockedOut = false;
  const answerRows: { question_id: string; value: string; points: number }[] = [];

  if (qset && qset.question_ids.length) {
    const { data: qs } = await supabase
      .from("questions")
      .select("*")
      .in("id", qset.question_ids);
    const questions = (qs ?? []) as Question[];
    const graded: { question: Question; value: string }[] = [];
    for (const q of questions) {
      const value = String(formData.get(`q:${q.id}`) ?? "").trim();
      if (!value) continue;
      graded.push({ question: q, value });
      answerRows.push({ question_id: q.id, value, points: answerPoints(q, value) });
    }
    const res = scoreApplication(graded, qset.required_ids);
    score = qset.scoring_mode === "none" ? null : res.score;
    knockedOut = res.knockedOut;
  }

  const { data: app, error } = await supabase
    .from("applications")
    .insert({
      job_id: jobId,
      candidate_id: user.id,
      cover_note: coverNote,
      score,
      knocked_out: knockedOut,
    })
    .select("id")
    .single();

  // Unique-violation = already applied; treat as success.
  if (error && error.code !== "23505") {
    redirect(`/jobs/${jobId}?error=apply_failed`);
  }

  if (app && answerRows.length) {
    await supabase.from("answers").insert(
      answerRows.map((a) => ({ application_id: app.id, ...a })),
    );
  }

  // Lifecycle metric.
  await supabase.from("app_events").insert({
    event: "application_submitted",
    actor_id: user.id,
    props: { job_id: jobId, with_questions: Boolean(qset), score, knocked_out: knockedOut },
  });

  // Notify the employer only on a genuinely new application (not a re-apply).
  if (app && job?.employer_id) {
    await notifyNewApplication(job.employer_id, job.title ?? "your job", jobId);
  }

  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}?applied=1`);
}
