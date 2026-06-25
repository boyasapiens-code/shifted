"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { NDSCA_VERSION, type TcMemberTier } from "@/lib/trust-circle";

async function requireEmployerUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/employer/trust-circle");
  return { supabase, user };
}

/** Join the network (creates a probation membership). */
export async function joinTrustCircle() {
  const { supabase } = await requireEmployerUser();
  await supabase.rpc("tc_join", { p_tier: "growth" });
  revalidatePath("/employer/trust-circle");
}

/** Sign the NDSCA — required before any network access. */
export async function signNdsca(formData: FormData) {
  const { supabase } = await requireEmployerUser();
  if (formData.get("agree") !== "on") redirect("/employer/trust-circle?error=agree");
  await supabase.rpc("tc_sign_ndsca", { p_version: NDSCA_VERSION });
  revalidatePath("/employer/trust-circle");
}

/** Pilot premium upgrade (stubbed) — Trust Circle tier unlocks pool search. */
export async function setTier(tier: TcMemberTier) {
  const { supabase } = await requireEmployerUser();
  await supabase.rpc("tc_set_tier", { p_tier: tier });
  revalidatePath("/employer/trust-circle");
}

const clamp = (v: FormDataEntryValue | null) => Math.min(5, Math.max(1, Number(v) || 3));

/** Endorse a worker you have managed — structured ratings only. */
export async function endorse(formData: FormData) {
  const { supabase } = await requireEmployerUser();
  const worker = String(formData.get("worker") ?? "");
  const role = String(formData.get("role") ?? "").trim();
  if (!worker || !role) redirect("/employer/trust-circle?error=endorse");
  const { error } = await supabase.rpc("tc_create_endorsement", {
    p_worker: worker,
    p_role: role,
    p_from: null,
    p_to: null,
    p_reliability: clamp(formData.get("rating_reliability")),
    p_skill: clamp(formData.get("rating_skill")),
    p_teamwork: clamp(formData.get("rating_teamwork")),
    p_punctuality: clamp(formData.get("rating_punctuality")),
    p_would_rehire: formData.get("would_rehire") === "on",
  });
  redirect(
    error ? "/employer/trust-circle?error=managed" : "/employer/trust-circle?done=endorsed",
  );
}

/** Request a structured reference on a consented candidate. */
export async function requestReference(workerId: string) {
  const { supabase } = await requireEmployerUser();
  await supabase.rpc("tc_request_reference", { p_worker: workerId });
  redirect("/employer/trust-circle?done=requested");
}
