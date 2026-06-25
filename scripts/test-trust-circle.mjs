#!/usr/bin/env node
// Trust Circle invariant tests (TRUST_CIRCLE_BUILD_SPEC.md §8 Definition of Done).
// Proves the non-negotiable rules at the DB layer by simulating auth.uid() via
// request.jwt.claims, exactly as Supabase does at runtime. Everything runs inside
// one transaction that is ROLLED BACK at the end — no test residue.
//
// Usage: node scripts/test-trust-circle.mjs
import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const client = new pg.Client({
  host: process.env.SUPABASE_DB_HOST,
  port: Number(process.env.SUPABASE_DB_PORT || 5432),
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: process.env.SUPABASE_DB_NAME || "postgres",
  ssl: { rejectUnauthorized: false },
});

let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}`);
  }
}

// Run a block of statements authenticated as a given user (sets the JWT sub),
// then reset back to the owner role.
async function asUser(uid, fn) {
  await client.query(
    `select set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role','authenticated')::text, true)`,
    [uid],
  );
  await client.query("set local role authenticated");
  try {
    return await fn();
  } finally {
    await client.query("reset role");
    await client.query(`select set_config('request.jwt.claims', null, true)`);
  }
}

await client.connect();
await client.query("begin");
try {
  // ── Fixtures from seeded data ─────────────────────────────────────────────
  const emp = await client.query(
    "select id from employer_profiles order by created_at limit 1",
  );
  const wrk = await client.query(
    "select id from candidate_profiles order by created_at limit 2",
  );
  if (!emp.rows.length || wrk.rows.length < 2) {
    throw new Error("need at least 1 seeded employer and 2 candidates to test");
  }
  const member = emp.rows[0].id; // the employer / Trust Circle member
  const workerA = wrk.rows[0].id; // subject of an endorsement
  const nonMember = wrk.rows[1].id; // a non-member identity

  // Make the employer an active trust_circle member (owner-level insert).
  await client.query(
    `insert into tc_member (employer_id, status, tier, ndsca_signed_at, ndsca_version)
     values ($1,'active','trust_circle', now(), 'test-v1')
     on conflict (employer_id) do update set status='active', tier='trust_circle',
       ndsca_signed_at=now(), ndsca_version='test-v1'`,
    [member],
  );
  const m = await client.query("select id from tc_member where employer_id=$1", [member]);
  const memberId = m.rows[0].id;

  // An endorsement of workerA by the member (owner insert — bypasses managed-gate
  // for the purpose of testing the READ/consent path).
  await client.query(
    `insert into tc_endorsement
       (worker_id, member_id, role_confirmed, rating_reliability, rating_skill,
        rating_teamwork, rating_punctuality, would_rehire)
     values ($1,$2,'Barista',5,4,5,4,true)
     on conflict (worker_id, member_id) do update set rating_reliability=5`,
    [workerA, memberId],
  );

  // ── Rule 1: consent gate — no consent ⇒ invisible ─────────────────────────
  console.log("Rule 1 — consent gate (no consent ⇒ invisible)");
  let r = await asUser(member, () =>
    client.query("select * from tc_view_endorsements($1)", [workerA]),
  );
  check("member sees 0 endorsements for a non-consented worker", r.rows.length === 0);
  let logs = await client.query(
    "select count(*)::int n from tc_access_log where worker_id=$1",
    [workerA],
  );
  check("fail-closed read writes no access_log row", logs.rows[0].n === 0);

  // Worker grants endorsement_visible consent (via the worker-auth function).
  await asUser(workerA, () =>
    client.query("select tc_grant_consent('endorsement_visible','test')"),
  );

  // ── Rule 1 + 5: consent present ⇒ visible AND audited ─────────────────────
  console.log("Rule 1 + 5 — consent present ⇒ visible & audited");
  r = await asUser(member, () =>
    client.query("select * from tc_view_endorsements($1)", [workerA]),
  );
  check("member now sees the endorsement", r.rows.length === 1);
  logs = await client.query(
    "select count(*)::int n from tc_access_log where worker_id=$1 and action='view_endorsement'",
    [workerA],
  );
  check("the read wrote a view_endorsement access_log row", logs.rows[0].n === 1);

  // ── Rule 5: full audit visibility — the worker can see the read ────────────
  console.log("Rule 5 — worker can see who read their data");
  const workerView = await asUser(workerA, () =>
    client.query("select count(*)::int n from tc_access_log"),
  );
  check("worker sees their own access_log rows", workerView.rows[0].n >= 1);
  const otherView = await asUser(nonMember, () =>
    client.query("select count(*)::int n from tc_access_log where worker_id=$1", [workerA]),
  );
  check("a different worker canNOT see workerA's access_log (RLS)", otherView.rows[0].n === 0);

  // ── Rule 6: revocable — withdrawal hides immediately ──────────────────────
  console.log("Rule 6 — withdrawal removes from new queries immediately");
  await asUser(workerA, () =>
    client.query("select tc_withdraw_consent('endorsement_visible')"),
  );
  r = await asUser(member, () =>
    client.query("select * from tc_view_endorsements($1)", [workerA]),
  );
  check("after withdrawal the endorsement is invisible again", r.rows.length === 0);

  // ── Member gate: search blocked without active member + NDSCA + tier ───────
  console.log("Member gate — search blocked for non-members");
  const nonMemberSearch = await asUser(nonMember, () =>
    client.query("select * from tc_search(null)"),
  );
  check("non-member search returns nothing (fail closed)", nonMemberSearch.rows.length === 0);

  // ── Rule 2/3/4: no sensitive / comp / employer-free-text columns exist ─────
  console.log("Rules 2-4 — schema has no sensitive, comp, or worker-free-text columns");
  const cols = await client.query(
    `select table_name, column_name, data_type
       from information_schema.columns
      where table_schema='public' and table_name like 'tc\\_%'`,
  );
  const banned = /(salary|wage|\bpay\b|compensation|\bcomp\b|bonus|health|medical|criminal|religion|ethnic|race|sexual|disab|union)/i;
  const offending = cols.rows.filter((c) => banned.test(c.column_name));
  check("no sensitive/compensation column anywhere in tc_*", offending.length === 0);

  // The only free text on worker-targeted tables must be tc_worker_response.body.
  const freeText = cols.rows.filter(
    (c) => c.data_type === "text" && !/^tc_worker_response$/.test(c.table_name),
  );
  // Allowed factual text fields (titles/versions), NOT free-form about a worker.
  const allowed = new Set([
    "tc_member.ndsca_version",
    "tc_endorsement.role_confirmed",
    "tc_reference_request.role_confirmed",
    "tc_worker_consent.granted_via",
  ]);
  const rogue = freeText.filter((c) => !allowed.has(`${c.table_name}.${c.column_name}`));
  check("no employer free-text-about-worker field exists", rogue.length === 0);
  const respBody = cols.rows.find(
    (c) => c.table_name === "tc_worker_response" && c.column_name === "body",
  );
  check("the one free-text field (tc_worker_response.body) belongs to the worker", !!respBody);

  console.log(`\n${pass} passed, ${fail} failed`);
} catch (e) {
  console.error("test error:", e.message);
  fail++;
} finally {
  await client.query("rollback"); // discard all fixtures
  await client.end();
}
process.exit(fail === 0 ? 0 : 1);
