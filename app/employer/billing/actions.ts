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

async function isPaid(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const { data } = await supabase
    .from("employer_profiles")
    .select("plan")
    .eq("id", id)
    .single();
  return data?.plan === "pro" || data?.plan === "growth";
}

/** STUB: activate a paid tier without taking payment. */
export async function upgradeTo(tier: "pro" | "growth") {
  const { supabase, user } = await requireUser();
  await supabase
    .from("employer_profiles")
    .update({ plan: tier, plan_since: new Date().toISOString() })
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

/** Featured employer placement — paid plans only. */
export async function toggleFeatured() {
  const { supabase, user } = await requireUser();
  if (!(await isPaid(supabase, user.id))) redirect("/employer/billing?gate=featured");
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

/** Boost a job to the top of search for 30 days — standalone pay-per-use. */
export async function boostJob(jobId: string) {
  const { supabase, user } = await requireUser();
  const until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("jobs")
    .update({ boosted_until: until })
    .eq("id", jobId)
    .eq("employer_id", user.id);
  revalidatePath("/employer");
  revalidatePath(`/employer/jobs/${jobId}`);
}
