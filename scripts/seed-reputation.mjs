#!/usr/bin/env node
// SHIFTED — seed sample reputation: completed engagements + two-way reviews
// between Stash BKK and a handful of workers, so ratings/reliability are visible.
// Idempotent. Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ws from "ws";
globalThis.WebSocket ||= ws;

const __dirname = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(join(__dirname, "..", ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: emp } = await sb.from("employer_profiles").select("id").eq("slug", "stash-bkk").single();
const { data: job } = await sb.from("jobs").select("id,title").eq("employer_id", emp.id).single();
const { data: workers } = await sb
  .from("candidate_profiles")
  .select("id, full_name")
  .not("full_name", "is", null)
  .order("full_name")
  .limit(6);

const plan = [
  { attendance: "on_time", emp: 5, wrk: 5, ec: "Reliable, excellent with customers.", wc: "Fair pay, clear shifts, great team." },
  { attendance: "on_time", emp: 5, wrk: 4, ec: "Always early, knows the menu cold.", wc: "Good management, busy but fair." },
  { attendance: "late", emp: 3, wrk: 4, ec: "Strong seller, a few late starts.", wc: "Solid place, fast-paced." },
  { attendance: "on_time", emp: 4, wrk: 5, ec: "Calm under pressure, dependable.", wc: "Best dispensary I've worked at." },
  { attendance: "no_show", emp: 2, wrk: 3, ec: "Skilled but missed a shift.", wc: "Decent, scheduling could improve." },
  { attendance: "on_time", emp: 5, wrk: 5, ec: "Trainer-level. Promote this one.", wc: "Real career growth here." },
];

let n = 0;
for (let i = 0; i < (workers?.length ?? 0); i++) {
  const w = workers[i];
  const p = plan[i % plan.length];
  const { data: eng } = await sb
    .from("engagements")
    .upsert(
      {
        employer_id: emp.id,
        worker_id: w.id,
        job_id: job.id,
        role_title: job.title,
        status: "completed",
        attendance: p.attendance,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "employer_id,worker_id,job_id" },
    )
    .select("id")
    .single();

  await sb.from("reviews").upsert(
    { engagement_id: eng.id, author_id: emp.id, subject_id: w.id, kind: "of_worker", rating: p.emp, comment: p.ec },
    { onConflict: "engagement_id,author_id" },
  );
  await sb.from("reviews").upsert(
    { engagement_id: eng.id, author_id: w.id, subject_id: emp.id, kind: "of_employer", rating: p.wrk, comment: p.wc },
    { onConflict: "engagement_id,author_id" },
  );
  n++;
  console.log(`  ✓ ${w.full_name}: ${p.attendance}, worker★${p.emp} / employer★${p.wrk}`);
}

const { data: e2 } = await sb.from("employer_profiles").select("rating_avg,rating_count").eq("id", emp.id).single();
console.log(`\n${n} engagements + ${n * 2} reviews seeded.`);
console.log(`Stash BKK rating: ${e2.rating_avg} (${e2.rating_count} reviews)`);
