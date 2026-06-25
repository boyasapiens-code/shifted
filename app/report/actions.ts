"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** File a confidential content report (every post/review has a Report button). */
export async function reportContent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const returnTo = String(formData.get("return_to") ?? "/");
  if (!user) redirect(`/login?next=${returnTo}`);

  await supabase.from("content_reports").insert({
    reporter_id: user.id,
    content_type: String(formData.get("content_type") ?? "other"),
    content_ref: String(formData.get("content_ref") ?? "") || null,
    reason: String(formData.get("reason") ?? "other"),
    detail: String(formData.get("detail") ?? "").trim() || null,
  });

  redirect(`${returnTo}?reported=1`);
}
