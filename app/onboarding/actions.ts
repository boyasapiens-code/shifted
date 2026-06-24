"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/constants";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");
  return { supabase, user };
}

export async function chooseCandidate() {
  const { supabase, user } = await requireUser();

  await supabase.from("profiles").update({ role: "candidate" }).eq("id", user.id);

  // Seed the candidate profile, carrying over any name from auth metadata.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  await supabase
    .from("candidate_profiles")
    .upsert(
      { id: user.id, full_name: profile?.full_name ?? null },
      { onConflict: "id", ignoreDuplicates: true },
    );

  redirect("/candidate/profile");
}

export async function chooseEmployer(formData: FormData) {
  const { supabase, user } = await requireUser();
  const companyName = String(formData.get("company_name") ?? "").trim();
  if (!companyName) redirect("/onboarding?error=company_required");

  await supabase.from("profiles").update({ role: "employer" }).eq("id", user.id);

  // Build a unique slug: base, then a short suffix if taken.
  const base = slugify(companyName) || "company";
  let slug = base;
  const { data: existing } = await supabase
    .from("employer_profiles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;

  await supabase.from("employer_profiles").upsert(
    {
      id: user.id,
      company_name: companyName,
      slug,
    },
    { onConflict: "id" },
  );

  redirect("/employer/profile");
}
