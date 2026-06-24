"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// --- Candidate -------------------------------------------------------------

export async function saveAvatar(url: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  revalidatePath("/candidate");
  revalidatePath("/candidate/profile");
}

export async function saveResume(path: string) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("candidate_profiles")
    .update({ resume_url: path })
    .eq("id", user.id);
  revalidatePath("/candidate/profile");
}

export async function addPortfolio(url: string) {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("candidate_profiles")
    .select("portfolio_urls")
    .eq("id", user.id)
    .single();
  const next = Array.from(new Set([...(data?.portfolio_urls ?? []), url]));
  await supabase
    .from("candidate_profiles")
    .update({ portfolio_urls: next })
    .eq("id", user.id);
  revalidatePath("/candidate/profile");
}

export async function removePortfolio(url: string) {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("candidate_profiles")
    .select("portfolio_urls")
    .eq("id", user.id)
    .single();
  const next = (data?.portfolio_urls ?? []).filter((u: string) => u !== url);
  await supabase
    .from("candidate_profiles")
    .update({ portfolio_urls: next })
    .eq("id", user.id);
  revalidatePath("/candidate/profile");
}

// --- Employer --------------------------------------------------------------

export async function saveLogo(url: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("employer_profiles").update({ logo_url: url }).eq("id", user.id);
  revalidatePath("/employer");
  revalidatePath("/employer/profile");
}

export async function saveCover(url: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("employer_profiles").update({ cover_url: url }).eq("id", user.id);
  revalidatePath("/employer/profile");
}

export async function addCompanyPhoto(url: string) {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("employer_profiles")
    .select("photos")
    .eq("id", user.id)
    .single();
  const next = Array.from(new Set([...(data?.photos ?? []), url]));
  await supabase.from("employer_profiles").update({ photos: next }).eq("id", user.id);
  revalidatePath("/employer");
  revalidatePath("/employer/profile");
}

export async function removeCompanyPhoto(url: string) {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("employer_profiles")
    .select("photos")
    .eq("id", user.id)
    .single();
  const next = (data?.photos ?? []).filter((u: string) => u !== url);
  await supabase.from("employer_profiles").update({ photos: next }).eq("id", user.id);
  revalidatePath("/employer");
  revalidatePath("/employer/profile");
}
