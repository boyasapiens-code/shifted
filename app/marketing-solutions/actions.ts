"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import type { InterestTier } from "@/lib/booyah";

const TIERS: InterestTier[] = ["idol", "boss", "legend", "diy", "unsure"];

/** Capture a Marketing Solutions lead ON-PLATFORM (attribution), then hand off. */
export async function submitMarketingLead(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Throttle spam from the public (logged-out) lead form: 5 per hour per IP.
  const ok = await rateLimit(supabase, `lead:${user?.id ?? (await clientIp())}`, 5, 3600);
  if (!ok) redirect("/marketing-solutions?error=busy#lead");

  const business_name = String(formData.get("business_name") ?? "").trim();
  if (!business_name) redirect("/marketing-solutions?error=missing#lead");

  const tierRaw = String(formData.get("interest_tier") ?? "unsure");
  const interest_tier = (TIERS.includes(tierRaw as InterestTier) ? tierRaw : "unsure") as InterestTier;

  // Tie to the employer account when logged in (attribution).
  const employer_id = user
    ? (
        await supabase
          .from("employer_profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle()
      ).data?.id ?? null
    : null;

  const { data: lead } = await supabase
    .from("marketing_leads")
    .insert({
      employer_id,
      business_name,
      location: String(formData.get("location") ?? "").trim() || null,
      category: String(formData.get("category") ?? "").trim() || null,
      contact_name: String(formData.get("contact_name") ?? "").trim() || null,
      contact_channel: String(formData.get("contact_channel") ?? "").trim() || null,
      interest_tier,
      message: String(formData.get("message") ?? "").trim() || null,
      source: "shifted_marketing_page",
    })
    .select("id")
    .single();

  // Fire the conversion event (DB event sink).
  await supabase.from("marketing_events").insert({
    event: "marketing_lead_submitted",
    props: { interestTier: interest_tier },
    employer_id,
  });

  redirect(`/marketing-solutions?submitted=${lead?.id ?? "1"}&tier=${interest_tier}#lead`);
}
