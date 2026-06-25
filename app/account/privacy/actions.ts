"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Log a PDPA data-subject request (export or deletion) for an admin to action. */
export async function submitDataRequest(kind: "export" | "delete") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/privacy");

  await supabase.from("data_requests").insert({
    user_id: user.id,
    email: user.email,
    kind,
  });
  redirect(`/account/privacy?submitted=${kind}`);
}
