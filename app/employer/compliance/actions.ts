"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COMPLIANCE_GROUPS } from "@/lib/compliance";

const ALL_ITEM_KEYS = COMPLIANCE_GROUPS.flatMap((g) => g.items.map((i) => i.key));

/** Save the employer's self-attested compliance checklist + context flags. */
export async function saveCompliance(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/employer/compliance");

  const items = ALL_ITEM_KEYS.filter((k) => formData.get(`item:${k}`) === "on");
  const foreign = formData.get("foreign_hires") === "on";
  const headcount = formData.get("headcount_10plus") === "on";

  await supabase
    .from("employer_profiles")
    .update({
      compliance_items: items,
      compliance_foreign_hires: foreign,
      compliance_headcount_10plus: headcount,
      compliance_attested_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  revalidatePath("/employer/compliance");
  revalidatePath("/employer");
  redirect("/employer/compliance?saved=1");
}
