#!/usr/bin/env node
// SHIFTED — demo seed for the verification feature.
//   • grants admin to the Stash BKK account (boyasapiens@gmail.com)
//   • creates sample verification submissions (approved + pending) so the
//     admin queue and trust badges are populated.
// Idempotent. Run: node scripts/seed-verification.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import ws from "ws";
globalThis.WebSocket ||= ws;

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// 1) Admin = the Stash BKK account
const { data: emp } = await sb.from("employer_profiles").select("id").eq("slug", "stash-bkk").single();
await sb.from("profiles").update({ is_admin: true }).eq("id", emp.id);
console.log("✓ admin granted to Stash BKK account");

// 2) Pick a handful of workers (exclude the admin)
const { data: workers } = await sb
  .from("candidate_profiles")
  .select("id, full_name")
  .neq("id", emp.id)
  .order("full_name", { ascending: true })
  .limit(6);

const now = new Date().toISOString();
const approved = (level) => ({ level, status: "approved", reviewer_id: emp.id, reviewed_at: now, details: `Level ${level} evidence provided.` });
const submitted = (level) => ({ level, status: "submitted", details: `Level ${level} evidence submitted for review.` });

// variety: full ladder, partial, single, and pending-in-queue
const plan = [
  [approved(1), approved(2), approved(3)],
  [approved(1), approved(2)],
  [approved(1)],
  [submitted(1)],
  [approved(1), submitted(2)],
  [submitted(1)],
];

let nApproved = 0, nPending = 0;
for (let i = 0; i < workers.length; i++) {
  for (const item of plan[i] ?? []) {
    await sb.from("verification_submissions").upsert(
      { candidate_id: workers[i].id, ...item },
      { onConflict: "candidate_id,level" },
    );
    if (item.status === "approved") nApproved++; else nPending++;
  }
}
console.log(`✓ seeded submissions: ${nApproved} approved, ${nPending} pending`);

// 3) Report resulting badge levels
const ids = workers.map((w) => w.id);
const { data: levels } = await sb.from("candidate_profiles").select("full_name, verification_level").in("id", ids).order("verification_level", { ascending: false });
levels.forEach((l) => console.log(`    ${l.full_name}: level ${l.verification_level}`));
console.log("DONE");
