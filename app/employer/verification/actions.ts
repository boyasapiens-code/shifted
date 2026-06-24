"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/employer/verification");
  return { supabase, user };
}

/** Submit (or resubmit) an employer verification layer for review. */
export async function submitEmployerVerification(layer: number, formData: FormData) {
  const { supabase, user } = await requireUser();

  if (layer > 1) {
    const { data: prev } = await supabase
      .from("employer_verification_submissions")
      .select("status")
      .eq("employer_id", user.id)
      .eq("layer", layer - 1)
      .maybeSingle();
    if (prev?.status !== "approved") {
      redirect("/employer/verification?error=locked");
    }
  }

  await supabase.from("employer_verification_submissions").upsert(
    {
      employer_id: user.id,
      layer,
      status: "submitted",
      details: String(formData.get("details") ?? "").trim() || null,
      reviewer_id: null,
      review_note: null,
      reviewed_at: null,
    },
    { onConflict: "employer_id,layer" },
  );

  revalidatePath("/employer/verification");
  redirect("/employer/verification?submitted=" + layer);
}

/** Attach an evidence document to an employer verification layer. */
export async function addEmployerVerificationDocument(layer: number, path: string) {
  const { supabase, user } = await requireUser();
  const { data: row } = await supabase
    .from("employer_verification_submissions")
    .select("documents")
    .eq("employer_id", user.id)
    .eq("layer", layer)
    .maybeSingle();
  const next = Array.from(new Set([...(row?.documents ?? []), path]));
  await supabase.from("employer_verification_submissions").upsert(
    { employer_id: user.id, layer, documents: next, status: "submitted" },
    { onConflict: "employer_id,layer" },
  );
  revalidatePath("/employer/verification");
}
