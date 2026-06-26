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

export interface EmployerContext {
  orgId: string; // the employer organization the user is acting on
  role: "owner" | "manager";
  isOwner: boolean;
  permissions: string[];
}

/**
 * Resolve which employer organization a user can act on: their own org if they
 * own an employer_profile, otherwise an active staff seat. Owners get
 * orgId === their own id (so existing owner flows are unchanged).
 */
export async function getEmployerContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  hasEmployer: boolean,
): Promise<EmployerContext | null> {
  if (hasEmployer) {
    return { orgId: userId, role: "owner", isOwner: true, permissions: [] };
  }
  // RLS returns only seats that reference this user (by id or invited email).
  const { data: seats } = await supabase
    .from("staff_seats")
    .select("employer_id, role, permissions")
    .neq("status", "revoked")
    .limit(1);
  const seat = seats?.[0];
  if (seat) {
    return {
      orgId: seat.employer_id,
      role: seat.role === "owner" ? "owner" : "manager",
      isOwner: false,
      permissions: seat.permissions ?? [],
    };
  }
  return null;
}

/** Require employer access (own org or an active seat); else route to onboarding. */
export async function requireEmployer(redirectTo = "/employer") {
  const { supabase, user, profile, hasEmployer } = await getAccount();
  if (!user) redirect(`/login?next=${redirectTo}`);
  const ctx = await getEmployerContext(supabase, user.id, hasEmployer);
  if (!ctx) redirect("/onboarding");
  return {
    supabase,
    user,
    profile,
    orgId: ctx.orgId,
    role: ctx.role,
    isOwner: ctx.isOwner,
    permissions: ctx.permissions,
  };
}

/** Require organization OWNER (blocks manager seats). */
export async function requireOwner(redirectTo = "/employer") {
  const r = await requireEmployer(redirectTo);
  if (!r.isOwner) redirect("/employer");
  return r;
}

/** Require an admin (reviewer) account. */
export async function requireAdmin(redirectTo: string) {
  const { supabase, user, profile } = await getAccount();
  if (!user) redirect(`/login?next=${redirectTo}`);
  if (!profile?.is_admin) redirect("/");
  return { supabase, user, profile };
}
