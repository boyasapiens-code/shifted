import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

/**
 * Loads the current account: the profile plus which sides (worker / employer)
 * exist. One account can hold both — capability is derived from the existence
 * of the candidate_profiles / employer_profiles rows; `active_view` is the
 * toggle state.
 */
export async function getAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
      profile: null as Profile | null,
      hasWorker: false,
      hasEmployer: false,
      activeView: null as Profile["active_view"],
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const [{ count: workerCount }, { count: employerCount }] = await Promise.all([
    supabase
      .from("candidate_profiles")
      .select("id", { count: "exact", head: true })
      .eq("id", user.id),
    supabase
      .from("employer_profiles")
      .select("id", { count: "exact", head: true })
      .eq("id", user.id),
  ]);

  return {
    supabase,
    user,
    profile,
    hasWorker: (workerCount ?? 0) > 0,
    hasEmployer: (employerCount ?? 0) > 0,
    activeView: profile?.active_view ?? null,
  };
}

/** Require a worker (candidate) profile; otherwise route to onboarding. */
export async function requireWorker(redirectTo: string) {
  const { supabase, user, profile, hasWorker } = await getAccount();
  if (!user) redirect(`/login?next=${redirectTo}`);
  if (!hasWorker) redirect("/onboarding");
  return { supabase, user, profile: profile! };
}

/** Require an employer profile; otherwise route to onboarding. */
export async function requireEmployer(redirectTo: string) {
  const { supabase, user, profile, hasEmployer } = await getAccount();
  if (!user) redirect(`/login?next=${redirectTo}`);
  if (!hasEmployer) redirect("/onboarding");
  return { supabase, user, profile: profile! };
}
