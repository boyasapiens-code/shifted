"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/candidate/skills");
  return { supabase, user };
}

/** Worker self-declares a skill (won't override an employer-verified one). */
export async function claimSkill(skillId: string, role: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("worker_skills").upsert(
    { worker_id: user.id, skill_id: skillId, status: "self_declared" },
    { onConflict: "worker_id,skill_id", ignoreDuplicates: true },
  );
  revalidatePath("/candidate/skills");
  redirect(`/candidate/skills?role=${role}`);
}

/** Worker removes a self-declared skill. */
export async function unclaimSkill(skillId: string, role: string) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("worker_skills")
    .delete()
    .eq("worker_id", user.id)
    .eq("skill_id", skillId)
    .eq("status", "self_declared");
  revalidatePath("/candidate/skills");
  redirect(`/candidate/skills?role=${role}`);
}
