import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

/**
 * Anon-key Supabase client with no cookie/session plumbing — safe to call
 * from anywhere, including build-time contexts with no request scope at all
 * (generateStaticParams, sitemap.ts), where next/headers' cookies() throws
 * ("called outside a request scope").
 *
 * RLS still applies via the anon role, so this can only ever see rows a
 * public policy allows (e.g. rights_articles/marketing_ideas/
 * marketing_spotlights' `status = 'published' OR is_admin()` — is_admin()
 * evaluates false with no session, so effectively "published only"). Only
 * use this for genuinely public reads; anything scoped to the current user
 * still needs the cookie-aware client from ./server.
 */
export function createPublicClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
