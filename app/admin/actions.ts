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
