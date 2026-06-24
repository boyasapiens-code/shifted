"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/employer/billing");
  return { supabase, user };
}

async function isPro(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const { data } = await supabase
    .from("employer_profiles")
    .select("plan")
    .eq("id", id)
    .single();
  return data?.plan === "pro";
}

/** STUB: activate Pro without taking payment. Real billing is out of scope. */
export async function upgradeToPro() {
  const { supabase, user } = await requireUser();
  await supabase
    .from("employer_profiles")
    .update({ plan: "pro", plan_since: new Date().toISOString() })
    .eq("id", user.id);
  revalidatePath("/employer", "layout");
  redirect("/employer/billing?upgraded=1");
}

export async function downgradeToFree() {
  const { supabase, user } = await requireUser();
  await supabase
    .from("employer_profiles")
    .update({ plan: "free", featured: false })
    .eq("id", user.id);
  revalidatePath("/employer", "layout");
  redirect("/employer/billing");
}

/** Featured employer placement — Pro only. */
export async function toggleFeatured() {
  const { supabase, user } = await requireUser();
  if (!(await isPro(supabase, user.id))) redirect("/employer/billing?gate=featured");
  const { data } = await supabase
    .from("employer_profiles")
    .select("featured")
    .eq("id", user.id)
    .single();
  await supabase
    .from("employer_profiles")
    .update({ featured: !data?.featured })
    .eq("id", user.id);
  revalidatePath("/employer/billing");
  revalidatePath("/employer");
}

/** Boost a job to the top of search for 30 days — Pro only. */
export async function boostJob(jobId: string) {
  const { supabase, user } = await requireUser();
  if (!(await isPro(supabase, user.id))) redirect("/employer/billing?gate=boost");
  const until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("jobs")
    .update({ boosted_until: until })
    .eq("id", jobId)
    .eq("employer_id", user.id);
  revalidatePath("/employer");
  revalidatePath(`/employer/jobs/${jobId}`);
}
