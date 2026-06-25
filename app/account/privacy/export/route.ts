import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PDPA right of access — the user downloads their own data as JSON, on demand.
// RLS scopes every query to the caller, so this only ever returns their rows.
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/account/privacy", req.url));

  const [profile, candidate, employer, applications, reviews, consents, accessLog] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("candidate_profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("employer_profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("applications").select("*").eq("candidate_id", user.id),
      supabase.from("reviews").select("*").eq("author_id", user.id),
      supabase.from("tc_worker_consent").select("*").eq("worker_id", user.id),
      supabase.from("tc_access_log").select("*").eq("worker_id", user.id),
    ]);

  const payload = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    profile: profile.data,
    candidate_profile: candidate.data,
    employer_profile: employer.data,
    applications: applications.data ?? [],
    reviews_authored: reviews.data ?? [],
    trust_circle_consents: consents.data ?? [],
    trust_circle_access_log: accessLog.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="shifted-data-${user.id}.json"`,
    },
  });
}
