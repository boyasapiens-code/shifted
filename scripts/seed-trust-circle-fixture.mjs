#!/usr/bin/env node
// Ensures a second, obviously-fake candidate exists so
// `npm run test:trust-circle` has the ≥2 candidate_profiles rows it needs as
// fixtures. Idempotent — safe to run repeatedly. Creates nothing if a
// candidate with FIXTURE_EMAIL already exists.
//
// This is NOT real PII: a throwaway auth user + candidate_profiles row,
// clearly labeled, that exists purely so the Trust Circle invariant suite
// (mandated green by CLAUDE.md before any tc_* change ships) has data to
// exercise now that seed data has been removed from production.
//
// Usage: node scripts/seed-trust-circle-fixture.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Node 20 lacks a native WebSocket global that supabase-js's realtime client
// expects; polyfill it before importing anything that touches supabase-js.
if (!globalThis.WebSocket) {
  const { default: WebSocket } = await import("ws");
  globalThis.WebSocket = WebSocket;
}

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const FIXTURE_EMAIL = "trust-circle-fixture@shiftedth.com";
const FIXTURE_NAME = "Trust Circle Test Fixture — do not contact";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// Look for an existing fixture user by email (paginate in case the user list
// grows — fine at this scale).
const { data: existing } = await supabase.auth.admin.listUsers({ perPage: 200 });
let user = existing?.users?.find((u) => u.email === FIXTURE_EMAIL);

if (!user) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: FIXTURE_EMAIL,
    email_confirm: true,
    user_metadata: { full_name: FIXTURE_NAME },
  });
  if (error) throw error;
  user = data.user;
  console.log(`Created fixture auth user: ${user.id}`);
} else {
  console.log(`Fixture auth user already exists: ${user.id}`);
}

const { error: upsertErr } = await supabase
  .from("candidate_profiles")
  .upsert(
    { id: user.id, full_name: FIXTURE_NAME, headline: "Test fixture — not a real candidate" },
    { onConflict: "id" },
  );
if (upsertErr) throw upsertErr;

console.log("candidate_profiles fixture row is in place. Re-run npm run test:trust-circle now.");
