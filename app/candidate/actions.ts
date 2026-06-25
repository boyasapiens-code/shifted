"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { moderateComment } from "@/lib/moderation";

function toList(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function updateCandidateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/candidate/profile");

  const fullName = String(formData.get("full_name") ?? "").trim();
  await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);

  await supabase
    .from("candidate_profiles")
    .update({
      full_name: fullName || null,
      headline: String(formData.get("headline") ?? "").trim() || null,
      bio: String(formData.get("bio") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      availability: String(formData.get("availability") ?? "").trim() || null,
      years_experience: Number(formData.get("years_experience") ?? 0) || 0,
      open_to_work: formData.get("open_to_work") === "on",
      languages: toList(formData.get("languages")),
      skills: toList(formData.get("skills")),
    })
    .eq("id", user.id);

  revalidatePath("/candidate");
  redirect("/candidate?saved=1");
}

/** Worker reviews an employer for a completed engagement (form action). */
export async function reviewEmployer(
  engagementId: string,
  employerId: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/candidate");

  const rating = Math.max(1, Math.min(5, Number(formData.get("rating") ?? 0)));
  const mod = await moderateComment(
    String(formData.get("comment") ?? ""),
    { contentType: "review", authorId: user.id, targetId: employerId },
    supabase,
  );
  await supabase.from("reviews").upsert(
    {
      engagement_id: engagementId,
      author_id: user.id,
      subject_id: employerId,
      kind: "of_employer",
      rating,
      comment: mod.comment,
      comment_status: mod.status,
    },
    { onConflict: "engagement_id,author_id" },
  );
  revalidatePath("/candidate");
  if (mod.action !== "ALLOW") redirect(`/candidate?moderation=${mod.action.toLowerCase()}`);
}
