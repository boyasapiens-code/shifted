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

// 3) Employer verification — Stash (L1+L2 approved, L3 pending), Greenstead (L1)
const { data: gs } = await sb.from("employer_profiles").select("id").eq("slug", "greenstead").maybeSingle();
const empVerif = [
  { employer_id: emp.id, layer: 1, status: "approved", reviewer_id: emp.id, reviewed_at: now, details: "DBD registration, VAT, and social security on file." },
  { employer_id: emp.id, layer: 2, status: "approved", reviewer_id: emp.id, reviewed_at: now, details: "Website, Google Business, and IG verified." },
  { employer_id: emp.id, layer: 3, status: "submitted", details: "Customer testimonials submitted for review." },
];
if (gs) empVerif.push({ employer_id: gs.id, layer: 1, status: "approved", reviewer_id: emp.id, reviewed_at: now, details: "Company registration on file." });
for (const e of empVerif) await sb.from("employer_verification_submissions").upsert(e, { onConflict: "employer_id,layer" });
console.log("✓ employer verification seeded (Stash L2 + pending L3, Greenstead L1)");

// 4) Engagements + shared references for a few workers
const { data: job } = await sb.from("jobs").select("id").eq("employer_id", emp.id).maybeSingle();
const refPlan = [
  { att: "on_time", rehire: true, noshow: false, rel: 5, note: "Excellent — punctual and great with customers." },
  { att: "on_time", rehire: true, noshow: false, rel: 4, note: "Reliable, solid team member." },
  { att: "late", rehire: true, noshow: false, rel: 3, note: "Good worker, occasionally late." },
  { att: "no_show", rehire: false, noshow: true, rel: 1, note: "No-showed a booked shift without notice." },
  { att: "on_time", rehire: true, noshow: false, rel: 5, note: "Great attitude, would hire again." },
];
let nRef = 0;
for (let i = 0; i < refPlan.length && i < workers.length; i++) {
  const w = workers[i], p = refPlan[i];
  const { data: eng } = await sb
    .from("engagements")
    .upsert(
      { employer_id: emp.id, worker_id: w.id, job_id: job?.id ?? null, role_title: "Budtender", status: "completed", attendance: p.att, completed_at: now },
      { onConflict: "employer_id,worker_id,job_id" },
    )
    .select("id")
    .single();
  if (eng) {
    await sb.from("hire_references").upsert(
      { engagement_id: eng.id, worker_id: w.id, employer_id: emp.id, reliability: p.rel, would_rehire: p.rehire, no_show: p.noshow, conduct_note: p.note },
      { onConflict: "engagement_id,employer_id" },
    );
    nRef++;
  }
}
console.log(`✓ ${nRef} engagements + references seeded`);

// 5) Report resulting badge levels
const ids = workers.map((w) => w.id);
const { data: levels } = await sb.from("candidate_profiles").select("full_name, verification_level, reliability_score, reference_count, would_rehire_count").in("id", ids).order("verification_level", { ascending: false });
levels.forEach((l) => console.log(`    ${l.full_name}: L${l.verification_level} · reliability ${l.reliability_score ?? "—"} · refs ${l.reference_count} (${l.would_rehire_count} rehire)`));
console.log("DONE");
