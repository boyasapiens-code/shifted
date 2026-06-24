"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { QUESTIONS, scoreArchetype, type ArchetypeKey } from "@/lib/archetypes";

/** Score the assessment and store the worker's archetype. */
export async function saveArchetype(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/candidate/archetype");

  const picks: ArchetypeKey[] = [];
  QUESTIONS.forEach((_, i) => {
    const v = formData.get(`q${i}`);
    if (v) picks.push(v as ArchetypeKey);
  });

  if (picks.length < QUESTIONS.length) {
    redirect("/candidate/archetype?error=incomplete");
  }

  const { archetype, scores } = scoreArchetype(picks);
  await supabase
    .from("candidate_profiles")
    .update({
      archetype,
      archetype_scores: scores,
      archetype_taken_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  revalidatePath("/candidate");
  redirect(`/candidate/archetype?result=${archetype}`);
}
