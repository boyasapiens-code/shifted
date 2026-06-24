import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Verifies an email OTP / magic-link token server-side (the SSR pattern).
 * Used by email links of the form /auth/confirm?token_hash=...&type=magiclink,
 * which works regardless of the Supabase Site URL and sets the session cookies
 * directly. New users go to onboarding; returning users to their active view.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/login?error=missing_token`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=link_expired`);
  }

  let destination = next ?? "/";
  if (!next) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("active_view, role")
        .eq("id", user.id)
        .single();
      const view =
        profile?.active_view ??
        (profile?.role === "employer" ? "employer" : profile?.role ? "worker" : null);
      destination = !view ? "/onboarding" : view === "employer" ? "/employer" : "/candidate";
    }
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
