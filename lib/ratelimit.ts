import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Best-effort client IP (Vercel sets x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Fixed-window rate limit via the DB (serverless-safe). Returns true if the
 * action is ALLOWED. Fails OPEN on any error — infra problems must never lock a
 * real user out of a legitimate action.
 */
export async function rateLimit(
  supabase: SupabaseClient,
  key: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}
