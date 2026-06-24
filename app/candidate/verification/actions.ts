"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/candidate/verification");
  return { supabase, user };
}

/** Submit (or resubmit) a level for review. Clears any prior review verdict. */
export async function submitVerification(level: number, formData: FormData) {
  const { supabase, user } = await requireUser();

  // Sequential gate: level N needs level N-1 approved.
  if (level > 1) {
    const { data: prev } = await supabase
      .from("verification_submissions")
      .select("status")
      .eq("candidate_id", user.id)
      .eq("level", level - 1)
      .maybeSingle();
    if (prev?.status !== "approved") {
      redirect("/candidate/verification?error=locked");
    }
  }

  await supabase.from("verification_submissions").upsert(
    {
      candidate_id: user.id,
      level,
      status: "submitted",
      details: String(formData.get("details") ?? "").trim() || null,
      reviewer_id: null,
      review_note: null,
      reviewed_at: null,
    },
    { onConflict: "candidate_id,level" },
  );

  revalidatePath("/candidate/verification");
  redirect("/candidate/verification?submitted=" + level);
}

/** Attach an evidence document (private 'verification' bucket path) to a level. */
export async function addVerificationDocument(level: number, path: string) {
  const { supabase, user } = await requireUser();
  const { data: row } = await supabase
    .from("verification_submissions")
    .select("documents")
    .eq("candidate_id", user.id)
    .eq("level", level)
    .maybeSingle();
  const next = Array.from(new Set([...(row?.documents ?? []), path]));
  await supabase.from("verification_submissions").upsert(
    { candidate_id: user.id, level, documents: next, status: "submitted" },
    { onConflict: "candidate_id,level" },
  );
  revalidatePath("/candidate/verification");
}
