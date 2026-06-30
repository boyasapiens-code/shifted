#!/usr/bin/env node
/**
 * One-off teardown: remove the seeded candidate accounts (imported Stash BKK
 * applicant/employee PII) so the platform starts clean for real signups.
 *
 * SAFETY — triple-guarded. A user is deleted ONLY if it:
 *   1. has a candidate_profile, AND
 *   2. has NO employer_profile  (never touches Stash BKK / Greenstead), AND
 *   3. is NOT an admin          (never touches the admin login).
 * Deletion uses the Auth Admin API; auth.users → profiles → candidate_profiles
 * and all worker_* / tc_* / applications / conversations cascade automatically.
 *
 * Run:  node scripts/cleanup-seed-candidates.mjs          (dry run — lists only)
 *       node scripts/cleanup-seed-candidates.mjs --apply  (actually deletes)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ws from "ws";
globalThis.WebSocket ||= ws;

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing SUPABASE URL / SERVICE_ROLE_KEY");
const supabase = createClient(url, key, { auth: { persistSession: false } });

const APPLY = process.argv.includes("--apply");

// --- build the delete set ---------------------------------------------------
const page = async (table, col = "id") => {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(col).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data.map((r) => r[col]));
    if (data.length < 1000) break;
  }
  return out;
};

const candidateIds = new Set(await page("candidate_profiles"));
const employerIds = new Set(await page("employer_profiles"));
const adminRows = await supabase.from("profiles").select("id").eq("is_admin", true);
const adminIds = new Set((adminRows.data ?? []).map((r) => r.id));

const toDelete = [...candidateIds].filter((id) => !employerIds.has(id) && !adminIds.has(id));
const skipped = [...candidateIds].filter((id) => employerIds.has(id) || adminIds.has(id));

console.log(`candidates:        ${candidateIds.size}`);
console.log(`  employer/admin overlap (kept): ${skipped.length}`);
console.log(`  → to delete:     ${toDelete.length}`);
console.log(`employers kept:    ${employerIds.size}`);
if (!APPLY) {
  console.log(`\nDRY RUN — nothing deleted. Re-run with --apply to execute.`);
  process.exit(0);
}

// --- delete -----------------------------------------------------------------
let ok = 0, fail = 0;
for (let i = 0; i < toDelete.length; i++) {
  const { error } = await supabase.auth.admin.deleteUser(toDelete[i]);
  if (error) { fail++; console.error(`  ✗ ${toDelete[i]}: ${error.message}`); }
  else { ok++; }
  if ((i + 1) % 25 === 0) console.log(`  …${i + 1}/${toDelete.length}`);
}
console.log(`\n✓ deleted ${ok}   ✗ failed ${fail}`);

const { count } = await supabase
  .from("candidate_profiles")
  .select("*", { count: "exact", head: true });
console.log(`candidate_profiles remaining: ${count}`);
