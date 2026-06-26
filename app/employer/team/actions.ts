"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";

/** Owner invites a teammate to the organization (by email + role). */
export async function inviteSeat(formData: FormData) {
  const { supabase, orgId } = await requireOwner("/employer/team");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "manager") === "owner" ? "owner" : "manager";
  if (!email) redirect("/employer/team?error=missing");
  await supabase.from("staff_seats").insert({
    employer_id: orgId,
    invited_email: email,
    role,
    status: "active",
  });
  revalidatePath("/employer/team");
  redirect("/employer/team?saved=1");
}

export async function revokeSeat(id: string) {
  const { supabase, orgId } = await requireOwner("/employer/team");
  await supabase
    .from("staff_seats")
    .update({ status: "revoked" })
    .eq("id", id)
    .eq("employer_id", orgId);
  revalidatePath("/employer/team");
}
