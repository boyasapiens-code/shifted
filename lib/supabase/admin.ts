import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. **BYPASSES RLS** — server-only. Never import
 * this into a Client Component, never expose the key to the browser.
 *
 * Used by trusted server paths (the Stripe webhook, preview-mode fulfilment)
 * that must write rows the end user is deliberately not allowed to write
 * themselves: marking a `payments` row 'paid' (employers have no UPDATE policy)
 * and extending a job's `boosted_until` past the `jobs_guard_boost()` trigger,
 * which only lets the service_role change it. That's what makes the boost
 * paywall real instead of UI-only.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "createAdminClient: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set",
    );
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
