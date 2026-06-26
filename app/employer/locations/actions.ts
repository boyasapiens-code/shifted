"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireEmployer } from "@/lib/auth";

export async function addLocation(formData: FormData) {
  const { supabase, orgId } = await requireEmployer();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/employer/locations?error=missing");
  await supabase.from("locations").insert({
    employer_id: orgId,
    name,
    address: String(formData.get("address") ?? "").trim() || null,
  });
  revalidatePath("/employer/locations");
  redirect("/employer/locations?saved=1");
}

export async function deleteLocation(id: string) {
  const { supabase, orgId } = await requireEmployer();
  await supabase.from("locations").delete().eq("id", id).eq("employer_id", orgId);
  revalidatePath("/employer/locations");
}

export async function setPrimaryLocation(id: string) {
  const { supabase, orgId } = await requireEmployer();
  await supabase.from("locations").update({ is_primary: false }).eq("employer_id", orgId);
  await supabase.from("locations").update({ is_primary: true }).eq("id", id).eq("employer_id", orgId);
  revalidatePath("/employer/locations");
}
