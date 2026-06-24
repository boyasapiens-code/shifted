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

// Budtender 4-tier skill stack (from the spec). [slug, name, badge, isGate]
const BUDTENDER = [
  // Tier 1 — Foundations
  [1, "product-types", "Product types & categories", null, false],
  [1, "cannabinoids", "THC / CBD / terpenes", null, false],
  [1, "compliance-basics", "Compliance: ID, limits, claims", "Compliance Certified", true],
  [1, "pos-cash", "POS & cash handling", null, false],
  [1, "handling-hygiene", "Product handling & hygiene", null, false],
  // Tier 2 — Core Craft
  [2, "strain-knowledge", "Strain knowledge", "Strain Scholar", false],
  [2, "intent-matching", "Intent matching", "Effect Matcher", false],
  [2, "consumption-guidance", "Consumption guidance", null, false],
  [2, "menu-knowledge", "Menu knowledge", null, false],
  [2, "inventory-basics", "Inventory basics", null, false],
  // Tier 3 — Service & Sales
  [3, "upsell-basket", "Upsell & basket building", "Upsell Pro", false],
  [3, "first-timer", "First-timer & tourist handling", "First-Timer Friendly", false],
  [3, "difficult-customer", "Difficult-customer handling", null, false],
  [3, "throughput", "Rush throughput", null, false],
  [3, "solo-close", "Solo open / close", "Solo Close", false],
  // Tier 4 — Lead / Trainer
  [4, "train-hires", "Train new hires (+compliance)", "Trainer", false],
  [4, "batch-inventory", "Inventory & batch management", null, false],
  [4, "cash-recon", "Cash reconciliation", null, false],
  [4, "compliance-audit", "Compliance audit", "Compliance Guardian", false],
  [4, "scheduling", "Scheduling", null, false],
];

let sort = 0;
for (const [tier, slug, name, badge, gate] of BUDTENDER) {
  await sb.from("skills").upsert(
    { role: "budtender", tier, slug, name, badge_name: badge, is_gate: gate, sort: sort++ },
    { onConflict: "role,slug" },
  );
}
console.log(`✓ Budtender skill stack: ${BUDTENDER.length} skills`);

const { data: skills } = await sb.from("skills").select("id, slug, tier").eq("role", "budtender");
const bySlug = new Map(skills.map((s) => [s.slug, s.id]));

// Demo: for Stash's completed engagements, self-declare T1+T2 and employer-verify a few.
const { data: emp } = await sb.from("employer_profiles").select("id").eq("slug", "stash-bkk").single();
const { data: engs } = await sb
  .from("engagements")
  .select("id, worker_id")
  .eq("employer_id", emp.id)
  .eq("status", "completed");

const VERIFY = ["compliance-basics", "strain-knowledge", "intent-matching", "upsell-basket"];
let claimed = 0, verified = 0;
for (const e of engs ?? []) {
  for (const s of skills) {
    if (s.tier > 2) continue; // self-declare foundations + core craft
    await sb.from("worker_skills").upsert(
      { worker_id: e.worker_id, skill_id: s.id, status: "self_declared" },
      { onConflict: "worker_id,skill_id", ignoreDuplicates: true },
    );
    claimed++;
  }
  for (const slug of VERIFY) {
    await sb.from("worker_skills").upsert(
      {
        worker_id: e.worker_id,
        skill_id: bySlug.get(slug),
        status: "employer_verified",
        verified_by: emp.id,
        engagement_id: e.id,
        verified_at: new Date().toISOString(),
      },
      { onConflict: "worker_id,skill_id" },
    );
    verified++;
  }
}
console.log(`✓ demo: ${engs?.length ?? 0} workers · ${claimed} self-declared · ${verified} employer-verified`);
console.log("DONE");
