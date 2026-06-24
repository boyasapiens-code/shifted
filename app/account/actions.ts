"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/constants";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Switch to the worker side, creating the profile on the fly if needed. */
export async function switchToWorker() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  await supabase
    .from("candidate_profiles")
    .upsert(
      { id: user.id, full_name: profile?.full_name ?? null },
      { onConflict: "id", ignoreDuplicates: true },
    );

  await supabase
    .from("profiles")
    .update({ active_view: "worker", role: profile?.role ?? "candidate" })
    .eq("id", user.id);

  revalidatePath("/", "layout");
  redirect("/candidate");
}

/** Switch to the employer side; route to the create form if it doesn't exist. */
export async function switchToEmployer() {
  const { supabase, user } = await requireUser();

  const { data: employer } = await supabase
    .from("employer_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!employer) redirect("/account/become-employer");

  await supabase.from("profiles").update({ active_view: "employer" }).eq("id", user.id);
  revalidatePath("/", "layout");
  redirect("/employer");
}

/** Create the employer side from a company name, then switch to it. */
export async function becomeEmployer(formData: FormData) {
  const { supabase, user } = await requireUser();
  const companyName = String(formData.get("company_name") ?? "").trim();
  if (!companyName) redirect("/account/become-employer?error=company_required");

  const base = slugify(companyName) || "company";
  let slug = base;
  const { data: existing } = await supabase
    .from("employer_profiles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;

  await supabase
    .from("employer_profiles")
    .upsert({ id: user.id, company_name: companyName, slug }, { onConflict: "id" });

  await supabase
    .from("profiles")
    .update({ active_view: "employer", role: "employer" })
    .eq("id", user.id);

  revalidatePath("/", "layout");
  redirect("/employer/profile");
}
