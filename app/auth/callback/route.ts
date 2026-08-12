import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * `next` arrives from the client (login page query string, forwarded through
 * AuthForm's emailRedirectTo) and is fully attacker-controllable — e.g.
 * `/login?next=//evil.com`. We currently build the redirect as
 * `${origin}${destination}` (string concatenation, not URL resolution), so a
 * value like "//evil.com" or "https://evil.com" lands as a path on our own
 * origin rather than a new host — not exploitable today. This validation
 * makes that safety explicit and defends against a future refactor (e.g. to
 * `redirect(next)` or `new URL(next, origin)`) turning it into a classic
 * open redirect. Only same-origin, single-leading-slash relative paths pass.
 */
function sanitizeNext(rawNext: string | null): string | null {
  if (!rawNext) return null;
  // Browsers strip ASCII tab/newline from URLs before parsing, which can
  // turn a value like "/\t/evil.com" into "//evil.com" once normalized.
  // Strip the same characters here so validation sees what would actually
  // be navigated to.
  const next = rawNext.replace(/[\t\n\r]/g, "");
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return null;
  }
  return next;
}

/**
 * OAuth + magic-link callback. Supabase redirects here with a `code`, which we
 * exchange for a session. New users (no role yet) go to onboarding; returning
 * users land on their role dashboard or the originally requested page.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNext(searchParams.get("next"));

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
        .select("active_view, role")
        .eq("id", user.id)
        .single();
      const view = profile?.active_view ?? (profile?.role === "employer" ? "employer" : profile?.role ? "worker" : null);
      if (!view) destination = "/onboarding";
      else destination = view === "employer" ? "/employer" : "/candidate";
    }
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
