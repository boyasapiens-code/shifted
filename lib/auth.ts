import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { AccountRole, Profile } from "./types";

/**
 * Loads the current user + profile, enforcing a required role.
 * Redirects to login (if signed out) or onboarding (if no role yet / wrong role).
 */
export async function requireRole(role: AccountRole, redirectTo: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${redirectTo}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile?.role) redirect("/onboarding");
  if (profile.role !== role) {
    redirect(profile.role === "employer" ? "/employer" : "/candidate");
  }

  return { supabase, user, profile };
}
