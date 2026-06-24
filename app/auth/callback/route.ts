import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth + magic-link callback. Supabase redirects here with a `code`, which we
 * exchange for a session. New users (no role yet) go to onboarding; returning
 * users land on their role dashboard or the originally requested page.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // Decide where to send them based on onboarding state.
  let destination = next ?? "/";
  if (!next) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!profile?.role) destination = "/onboarding";
      else destination = profile.role === "employer" ? "/employer" : "/candidate";
    }
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
