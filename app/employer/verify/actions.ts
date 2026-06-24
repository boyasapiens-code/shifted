"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireEmployer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/employer/verify");
  return { supabase, user };
}

/** One tap: confirm a milestone → award the badge, log the manager + time. */
export async function confirmPrompt(promptId: string) {
  const { supabase, user } = await requireEmployer();
  const { data: p } = await supabase
    .from("verification_prompts")
    .select("worker_id, skill_id, engagement_id, status")
    .eq("id", promptId)
    .eq("employer_id", user.id)
    .single();
  if (!p || p.status !== "pending") return;

  await supabase
    .from("verification_prompts")
    .update({ status: "confirmed", manager_id: user.id, responded_at: new Date().toISOString() })
    .eq("id", promptId);

  await supabase.from("worker_skills").upsert(
    {
      worker_id: p.worker_id,
      skill_id: p.skill_id,
      status: "employer_verified",
      verified_by: user.id,
      engagement_id: p.engagement_id,
      verified_at: new Date().toISOString(),
    },
    { onConflict: "worker_id,skill_id" },
  );

  revalidatePath("/employer/verify");
  revalidatePath("/employer");
}

/** "Not this time" — no badge, no penalty, counts as a response. */
export async function declinePrompt(promptId: string, formData?: FormData) {
  const { supabase, user } = await requireEmployer();
  await supabase
    .from("verification_prompts")
    .update({
      status: "declined",
      manager_id: user.id,
      responded_at: new Date().toISOString(),
      note: formData ? String(formData.get("note") ?? "").trim() || null : null,
    })
    .eq("id", promptId)
    .eq("employer_id", user.id)
    .eq("status", "pending");

  revalidatePath("/employer/verify");
  revalidatePath("/employer");
}
