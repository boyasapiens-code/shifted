"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TcConsentScope, TcResponseTarget } from "@/lib/trust-circle";
import { moderate } from "@/lib/moderation";

async function requireWorkerUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/candidate/trust-circle");
  return { supabase, user };
}

/** Worker grants a consent scope. */
export async function grantConsent(scope: TcConsentScope) {
  const { supabase } = await requireWorkerUser();
  await supabase.rpc("tc_grant_consent", { p_scope: scope, p_via: "candidate-trust-circle" });
  revalidatePath("/candidate/trust-circle");
}

/** Worker withdraws a consent scope — future visibility off immediately. */
export async function withdrawConsent(scope: TcConsentScope) {
  const { supabase } = await requireWorkerUser();
  await supabase.rpc("tc_withdraw_consent", { p_scope: scope });
  revalidatePath("/candidate/trust-circle");
}

/** Worker attaches a right-to-respond to an endorsement or reference. */
export async function respond(formData: FormData) {
  const { supabase, user } = await requireWorkerUser();
  const target_type = String(formData.get("target_type") ?? "") as TcResponseTarget;
  const target_id = String(formData.get("target_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body || !target_id) redirect("/candidate/trust-circle");
  // Worker's own speech is protected — only hard violations (sensitive data,
  // doxxing, threats) are blocked. Still logged for the audit trail.
  const { result } = await moderate(
    body,
    { contentType: "response", contentRef: target_id, authorId: user.id },
    supabase,
  );
  if (result.action === "BLOCK") {
    revalidatePath("/candidate/trust-circle");
    redirect("/candidate/trust-circle?moderation=blocked");
  }
  await supabase.rpc("tc_respond", {
    p_target_type: target_type,
    p_target_id: target_id,
    p_body: body,
  });
  revalidatePath("/candidate/trust-circle");
}
