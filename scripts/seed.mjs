#!/usr/bin/env node
/**
 * SHIFTED — seed loader.
 *
 * Loads scripts/seed-data/*.json (produced by extract.py) into Supabase:
 *   • Stash BKK as a verified employer
 *   • a published Budtender job
 *   • 23 applicants  → candidate profiles + applications to the job
 *   • 140 employees  → candidate profiles (talent pool, open_to_work=false)
 *
 * Because SHIFTED profiles are FK'd to Supabase Auth, this creates real auth
 * users via the Admin API. It is IDEMPOTENT — safe to re-run.
 *
 * Requires (read from .env.local or the environment):
 *   NEXT_PUBLIC_SUPABASE_URL   (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY  (server-only secret — never expose to the browser)
 *
 * Run:  node scripts/seed.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ws from "ws";

// Node < 22 has no global WebSocket; supabase-js eagerly inits Realtime. Polyfill.
globalThis.WebSocket ||= ws;

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "seed-data");

// --- env -------------------------------------------------------------------
function loadEnvLocal() {
  const path = join(__dirname, "..", ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnvLocal();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_KEY) {
  console.error(
    "✗ Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY " +
      "in .env.local (service role key is under Supabase → Project Settings → API).",
  );
  process.exit(1);
}

const supabase = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const read = (f) => JSON.parse(readFileSync(join(DATA, f), "utf8"));

// --- helpers ---------------------------------------------------------------
function slugEmail(name, i) {
  const slug = String(name || "user")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "")
    .slice(0, 24);
  return `seed.${slug || "user"}.${i}@stash.local`;
}

/** Build an email → user id map of all existing auth users. */
async function loadUserMap() {
  const map = new Map();
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    for (const u of data.users) if (u.email) map.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 1000) break;
    page += 1;
  }
  return map;
}

async function ensureUser(map, email, fullName) {
  const key = email.toLowerCase();
  if (map.has(key)) return map.get(key);
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw new Error(`createUser(${email}): ${error.message}`);
  map.set(key, data.user.id);
  return data.user.id;
}

async function setRole(id, role, fullName) {
  await supabase.from("profiles").update({ role, full_name: fullName }).eq("id", id);
}

// --- seed ------------------------------------------------------------------
async function main() {
  const employer = read("employer.json");
  const job = read("job.json");
  const applicants = read("applicants.json");
  const employees = read("employees.json");

  console.log("→ Loading existing auth users…");
  const map = await loadUserMap();
  console.log(`  ${map.size} existing users`);

  // 1) Employer
  console.log("→ Employer: Stash BKK");
  const employerId = await ensureUser(map, employer.email, employer.company_name);
  await setRole(employerId, "employer", employer.company_name);
  await supabase.from("employer_profiles").upsert(
    {
      id: employerId,
      company_name: employer.company_name,
      slug: employer.slug,
      industry: employer.industry,
      description: employer.description,
      location: employer.location,
      business_registered: employer.business_registered,
      salary_transparency: employer.salary_transparency,
      verification: employer.verification,
    },
    { onConflict: "id" },
  );

  // 2) Job (idempotent by employer + title)
  console.log("→ Job: Budtender");
  const { data: existingJob } = await supabase
    .from("jobs")
    .select("id")
    .eq("employer_id", employerId)
    .eq("title", job.title)
    .maybeSingle();

  let jobId = existingJob?.id;
  if (!jobId) {
    const { data, error } = await supabase
      .from("jobs")
      .insert({
        employer_id: employerId,
        title: job.title,
        description: job.description,
        industry: job.industry,
        location: job.location,
        employment_type: job.employment_type,
        shift_work: job.shift_work,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        salary_period: job.salary_period,
        languages_required: job.languages_required,
        experience_required: job.experience_required,
        status: job.status,
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    jobId = data.id;
  }

  // 3) Candidate upsert helper
  async function upsertCandidate(rec, i) {
    const email = rec.email || slugEmail(rec.full_name, i);
    const id = await ensureUser(map, email, rec.full_name);
    await setRole(id, "candidate", rec.full_name);
    await supabase.from("candidate_profiles").upsert(
      {
        id,
        full_name: rec.full_name,
        headline: rec.headline || null,
        bio: rec.bio || null,
        location: rec.location || null,
        phone: rec.phone || null,
        languages: rec.languages || [],
        skills: rec.skills || [],
        availability: rec.availability || null,
        open_to_work: rec.open_to_work,
      },
      { onConflict: "id" },
    );
    return id;
  }

  // 4) Applicants → candidate profiles (talent pool).
  // The budtender form is an external Google Form, not SHIFTED applications, so
  // we do NOT create application rows to the Budtender job by default. Hired
  // applicants still appear as current staff via the Team (staff table).
  // Set SEED_APPLICATIONS=1 to also create application rows (demo only).
  const seedApps = process.env.SEED_APPLICATIONS === "1";
  console.log(`→ Applicants → candidate profiles: ${applicants.length}${seedApps ? " (+applications)" : ""}`);
  let n = 0;
  for (const rec of applicants) {
    const candidateId = await upsertCandidate(rec, n);
    if (seedApps) {
      await supabase.from("applications").upsert(
        {
          job_id: jobId,
          candidate_id: candidateId,
          status: rec.application_status || "applied",
          cover_note: rec.cover_note || null,
        },
        { onConflict: "job_id,candidate_id" },
      );
    }
    if (++n % 5 === 0) process.stdout.write(`  …${n}\r`);
  }
  console.log(`  ${n} candidate profiles seeded`);

  // 5) Employees → talent-pool candidates
  console.log(`→ Employees: ${employees.length}`);
  let m = 0;
  for (const rec of employees) {
    await upsertCandidate(rec, 1000 + m);
    if (++m % 20 === 0) process.stdout.write(`  …${m}\r`);
  }
  console.log(`  ${m} employees seeded`);

  // 5b) Current Stash BKK staff → Team (staff table)
  let stashStaff = 0;
  const stashStaffPath = join(DATA, "stash-staff.json");
  if (existsSync(stashStaffPath)) {
    const team = JSON.parse(readFileSync(stashStaffPath, "utf8"));
    for (const s of team) {
      await supabase.from("staff").upsert(
        {
          employer_id: employerId,
          full_name: s.full_name,
          role_title: s.role_title ?? null,
          currency: "THB",
        },
        { onConflict: "employer_id,full_name" },
      );
      stashStaff += 1;
    }
    console.log(`→ Stash BKK Team: ${stashStaff} current staff seeded`);
  }

  // 6) Greenstead — second employer + staff records (optional files)
  let staffCount = 0;
  const gsEmployerPath = join(DATA, "greenstead-employer.json");
  if (existsSync(gsEmployerPath)) {
    console.log("→ Employer: Greenstead Co., Ltd.");
    const gs = JSON.parse(readFileSync(gsEmployerPath, "utf8"));
    const gsId = await ensureUser(map, gs.email, gs.company_name);
    await setRole(gsId, "employer", gs.company_name);
    await supabase.from("employer_profiles").upsert(
      {
        id: gsId,
        company_name: gs.company_name,
        slug: gs.slug,
        industry: gs.industry,
        description: gs.description,
        location: gs.location,
        website: gs.website ?? null,
        business_registered: gs.business_registered,
        salary_transparency: gs.salary_transparency,
        verification: gs.verification,
      },
      { onConflict: "id" },
    );

    const staff = JSON.parse(readFileSync(join(DATA, "greenstead-staff.json"), "utf8"));
    for (const s of staff) {
      await supabase.from("staff").upsert(
        {
          employer_id: gsId,
          full_name: s.full_name,
          net_salary: s.net_salary,
          currency: "THB",
          period: s.period,
        },
        { onConflict: "employer_id,full_name" },
      );
      staffCount += 1;
    }
    console.log(`  ${staffCount} staff records seeded`);
  }

  console.log("\n✓ Seed complete.");
  console.log(
    `  Stash BKK — Budtender, ${stashStaff} current team, ${n + m} candidate profiles` +
      (staffCount ? `  |  Greenstead — ${staffCount} staff` : ""),
  );
}

main().catch((e) => {
  console.error("\n✗ Seed failed:", e.message);
  process.exit(1);
});
