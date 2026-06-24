"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus, EmploymentType, Industry } from "@/lib/types";

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
