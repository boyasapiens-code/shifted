"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";

async function capture(
  fields: Record<string, string | null>,
  source: string,
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ok = await rateLimit(supabase, `ms:${user?.id ?? (await clientIp())}`, 6, 3600);
  if (!ok) return false;
  await supabase.from("marketing_leads").insert({
    employer_id: user ? user.id : null,
    source,
    ...fields,
  });
  // Lightweight conversion event (DB sink).
  await supabase.from("marketing_events").insert({
    event: "marketing_lead_submitted",
    props: { source },
    employer_id: user?.id ?? null,
  });
  return true;
}

/** "Get featured" — a business introduces itself for a Spotlight. */
export async function submitFeatured(formData: FormData) {
  const business_name = String(formData.get("business_name") ?? "").trim();
  if (!business_name) redirect("/marketing-solutions/spotlights?error=missing");
  const ok = await capture(
    {
      business_name,
      contact_name: String(formData.get("contact_name") ?? "").trim() || null,
      contact_channel: String(formData.get("contact_channel") ?? "").trim() || null,
      category: String(formData.get("category") ?? "").trim() || null,
      location: String(formData.get("area") ?? "").trim() || null,
      message: String(formData.get("pitch") ?? "").trim() || null,
    },
    "ms-featured",
  );
  redirect(`/marketing-solutions/spotlights?submitted=${ok ? "featured" : ""}${ok ? "" : "&error=busy"}`);
}

/** "Get a solution" — partner-solution enquiry from the Solutions page. */
export async function submitEnquiry(formData: FormData) {
  const business_name = String(formData.get("business_name") ?? "").trim();
  if (!business_name) redirect("/marketing-solutions/solutions?error=missing");
  const need = String(formData.get("need") ?? "other");
  const ok = await capture(
    {
      business_name,
      contact_name: String(formData.get("contact_name") ?? "").trim() || null,
      contact_channel: String(formData.get("contact_channel") ?? "").trim() || null,
      message: `[${need}] ${String(formData.get("message") ?? "").trim()}`,
    },
    "ms-solution",
  );
  redirect(`/marketing-solutions/solutions?submitted=${ok ? "enquiry" : ""}${ok ? "" : "&error=busy"}`);
}

/** Blog subscribe — email only. */
export async function subscribe(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const returnTo = String(formData.get("return_to") ?? "/marketing-solutions/ideas");
  if (!email) redirect(returnTo);
  const ok = await capture(
    { business_name: "(newsletter)", contact_channel: email },
    "ms-subscribe",
  );
  redirect(`${returnTo}?subscribed=${ok ? "1" : "0"}`);
}
