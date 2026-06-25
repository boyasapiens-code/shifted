"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/verifications");
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) redirect("/");
  return { supabase, user };
}

/** Admin updates a Marketing Solutions lead's follow-up status. */
export async function updateMarketingLeadStatus(id: string, status: string) {
  const { supabase } = await requireAdminUser();
  await supabase.from("marketing_leads").update({ status }).eq("id", id);
  revalidatePath("/admin/marketing");
}

/** Human confirms a held moderation decision (allow or block). */
export async function reviewModeration(id: string, decision: "allowed" | "blocked") {
  const { supabase, user } = await requireAdminUser();
  await supabase
    .from("moderation_decisions")
    .update({ review_action: decision, reviewer_id: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin/moderation");
}

/** Admin resolves a content report. */
export async function resolveReport(id: string, status: string) {
  const { supabase } = await requireAdminUser();
  await supabase.from("content_reports").update({ status }).eq("id", id);
  revalidatePath("/admin/moderation");
}

/** Admin marks a PDPA data-subject request actioned. */
export async function resolveDataRequest(id: string, status: string) {
  const { supabase } = await requireAdminUser();
  await supabase.from("data_requests").update({ status }).eq("id", id);
  revalidatePath("/admin/data-requests");
}

/** Admin approves an employer-suggested question into the global bank. */
export async function approveQuestion(id: string) {
  const { supabase } = await requireAdminUser();
  await supabase
    .from("questions")
    .update({ status: "active", is_global: true })
    .eq("id", id);
  revalidatePath("/admin/questions");
}

/** Admin rejects a suggested question. */
export async function rejectQuestion(id: string) {
  const { supabase } = await requireAdminUser();
  await supabase.from("questions").update({ status: "rejected" }).eq("id", id);
  revalidatePath("/admin/questions");
}

/** Ops test console — classify arbitrary content (logged as a 'console' decision). */
export async function runConsole(formData: FormData) {
  const { supabase, user } = await requireAdminUser();
  const text = String(formData.get("text") ?? "").trim();
  const contentType = String(formData.get("content_type") ?? "review");
  if (text) {
    const { moderate } = await import("@/lib/moderation");
    await moderate(
      text,
      { contentType: contentType as never, authorId: user.id },
      supabase,
    );
  }
  revalidatePath("/admin/moderation");
  redirect("/admin/moderation#console");
}

export async function approveVerification(id: string) {
  const { supabase, user } = await requireAdminUser();
  await supabase
    .from("verification_submissions")
    .update({
      status: "approved",
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: null,
    })
    .eq("id", id);
  revalidatePath("/admin/verifications");
}

export async function rejectVerification(id: string, formData: FormData) {
  const { supabase, user } = await requireAdminUser();
  await supabase
    .from("verification_submissions")
    .update({
      status: "rejected",
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: String(formData.get("note") ?? "").trim() || "Needs more / clearer evidence.",
    })
    .eq("id", id);
  revalidatePath("/admin/verifications");
}

export async function approveEmployerVerification(id: string) {
  const { supabase, user } = await requireAdminUser();
  await supabase
    .from("employer_verification_submissions")
    .update({
      status: "approved",
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: null,
    })
    .eq("id", id);
  revalidatePath("/admin/verifications");
}

export async function rejectEmployerVerification(id: string, formData: FormData) {
  const { supabase, user } = await requireAdminUser();
  await supabase
    .from("employer_verification_submissions")
    .update({
      status: "rejected",
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: String(formData.get("note") ?? "").trim() || "Needs more / clearer evidence.",
    })
    .eq("id", id);
  revalidatePath("/admin/verifications");
}
