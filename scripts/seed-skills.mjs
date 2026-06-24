#!/usr/bin/env node
// SHIFTED — seed the Budtender skill stack (the Stash-relevant role) and a few
// demo verifications against existing completed engagements. Idempotent.
// The catalog is generic — adding more roles is just more rows.
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

// Budtender 4-tier skill stack. [tier, slug, name, badge, isGate, verifyMethod]
// verifyMethod: 'none' | 'manual' (human prompt) | 'auto' (system-proven)
const BUDTENDER = [
  [1, "product-types", "Product types & categories", null, false, "none"],
  [1, "cannabinoids", "THC / CBD / terpenes", null, false, "none"],
  [1, "compliance-basics", "Compliance: ID, limits, claims", "Compliance Certified", true, "manual"],
  [1, "pos-cash", "POS & cash handling", null, false, "none"],
  [1, "handling-hygiene", "Product handling & hygiene", null, false, "none"],
  [2, "strain-knowledge", "Strain knowledge", "Strain Scholar", false, "manual"],
  [2, "intent-matching", "Intent matching", "Effect Matcher", false, "manual"],
  [2, "consumption-guidance", "Consumption guidance", null, false, "none"],
  [2, "menu-knowledge", "Menu knowledge", null, false, "none"],
  [2, "inventory-basics", "Inventory basics", null, false, "none"],
  [3, "upsell-basket", "Upsell & basket building", "Upsell Pro", false, "auto"],
  [3, "first-timer", "First-timer & tourist handling", "First-Timer Friendly", false, "manual"],
  [3, "difficult-customer", "Difficult-customer handling", null, false, "none"],
  [3, "throughput", "Rush throughput", null, false, "none"],
  [3, "solo-close", "Solo open / close", "Solo Close", false, "manual"],
  [4, "train-hires", "Train new hires (+compliance)", "Trainer", false, "manual"],
  [4, "batch-inventory", "Inventory & batch management", null, false, "none"],
  [4, "cash-recon", "Cash reconciliation", null, false, "none"],
  [4, "compliance-audit", "Compliance audit", "Compliance Guardian", false, "manual"],
  [4, "scheduling", "Scheduling", null, false, "none"],
];

let sort = 0;
for (const [tier, slug, name, badge, gate, method] of BUDTENDER) {
  await sb.from("skills").upsert(
    { role: "budtender", tier, slug, name, badge_name: badge, is_gate: gate, verify_method: method, sort: sort++ },
    { onConflict: "role,slug" },
  );
}
console.log(`✓ Budtender skill stack: ${BUDTENDER.length} skills`);

const { data: skills } = await sb.from("skills").select("id, slug, tier, badge_name, verify_method").eq("role", "budtender");
const bySlug = new Map(skills.map((s) => [s.slug, s]));

const { data: emp } = await sb.from("employer_profiles").select("id").eq("slug", "stash-bkk").single();
const { data: engs } = await sb
  .from("engagements")
  .select("id, worker_id")
  .eq("employer_id", emp.id)
  .eq("status", "completed");

// self-declare foundations + core craft for each engaged worker
let claimed = 0;
for (const e of engs ?? []) {
  for (const s of skills) {
    if (s.tier > 2) continue;
    await sb.from("worker_skills").upsert(
      { worker_id: e.worker_id, skill_id: s.id, status: "self_declared" },
      { onConflict: "worker_id,skill_id", ignoreDuplicates: true },
    );
    claimed++;
  }
}

// Demo prompts: manual milestone badges generate prompts; deterministic mix of
// confirmed / pending / declined so the inbox is populated and Stash has a
// response rate. Auto badges (Upsell Pro) are system-confirmed.
const MANUAL = ["compliance-basics", "strain-knowledge", "intent-matching", "first-timer", "solo-close"];
const now = new Date().toISOString();
let pending = 0, confirmed = 0, declined = 0, auto = 0;

async function award(workerId, skillId, engId) {
  await sb.from("worker_skills").upsert(
    { worker_id: workerId, skill_id: skillId, status: "employer_verified", verified_by: emp.id, engagement_id: engId, verified_at: now },
    { onConflict: "worker_id,skill_id" },
  );
}

for (const e of engs ?? []) {
  for (let j = 0; j < MANUAL.length; j++) {
    const s = bySlug.get(MANUAL[j]);
    const status = j < 3 ? "confirmed" : j === 3 ? "pending" : "declined";
    await sb.from("verification_prompts").upsert(
      {
        worker_id: e.worker_id, employer_id: emp.id, skill_id: s.id, engagement_id: e.id,
        badge_type: s.badge_name, method: "manual", status,
        manager_id: status === "pending" ? null : emp.id,
        responded_at: status === "pending" ? null : now,
      },
      { onConflict: "engagement_id,skill_id" },
    );
    if (status === "confirmed") { await award(e.worker_id, s.id, e.id); confirmed++; }
    else if (status === "pending") pending++;
    else declined++;
  }
  // auto: Upsell Pro
  const up = bySlug.get("upsell-basket");
  await sb.from("verification_prompts").upsert(
    { worker_id: e.worker_id, employer_id: emp.id, skill_id: up.id, engagement_id: e.id, badge_type: up.badge_name, method: "auto_pos", status: "confirmed", manager_id: emp.id, responded_at: now },
    { onConflict: "engagement_id,skill_id" },
  );
  await award(e.worker_id, up.id, e.id);
  auto++;
}

const { data: chk } = await sb.from("employer_profiles").select("response_rate, prompts_responded, prompts_eligible").eq("id", emp.id).single();
console.log(`✓ ${engs?.length ?? 0} workers · ${claimed} self-declared`);
console.log(`✓ prompts: ${confirmed} confirmed · ${pending} pending · ${declined} declined · ${auto} auto`);
console.log(`✓ Stash response rate: ${chk.response_rate} (${chk.prompts_responded}/${chk.prompts_eligible})`);
console.log("DONE");
