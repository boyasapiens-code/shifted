#!/usr/bin/env node
// Moderation calibration tests — the worked-examples regression set from
// SHIFTED_AI_Moderation_Engine.md §5. Runs the DETERMINISTIC gate only (no LLM
// key needed): it asserts the hard-block / hold safety floor. "every model
// update must re-pass it."
//
// Usage: node scripts/test-moderation.mjs  (or: npm run test:moderation)
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import ts from "typescript";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Transpile rules.ts (its only import is `import type`, which erases to nothing)
// to a temp ESM file we can import from plain Node 20.
const src = readFileSync(join(root, "lib/moderation/rules.ts"), "utf8");
const js = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const tmp = join(__dirname, ".tmp-rules.mjs");
writeFileSync(tmp, js);
let runRules;
try {
  ({ runRules } = await import(pathToFileURL(tmp).href));
} finally {
  unlinkSync(tmp);
}

const CASES = [
  { text: "Loved the team, fair tips, would work again.", expect: "ALLOW", ctx: "review" },
  { text: "Honestly the closing shifts ran long and I burned out. Not for me.", expect: "ALLOW", ctx: "review" },
  { text: "Manera started my shift 30 min late 3 times in March, no extra pay.", expect: "ALLOW", ctx: "review" },
  { text: "This owner is a thief who steals everyone's wages.", expect: "HOLD", ctx: "review" },
  { text: "The manager Khun A has HIV, stay away.", expect: "BLOCK", ctx: "review" },
  { text: "Worker Somchai, phone 081-234-5678, is unreliable — don't hire.", expect: "BLOCK", ctx: "review" },
  { text: "Hiring: must be Thai only, no Muslims.", expect: "BLOCK", ctx: "job_post" },
  { text: "Earn 5,000/day from home, pay 500 deposit to start.", expect: "BLOCK", ctx: "job_post" },
  { text: "Part-time barista, 300/day, 10 hours, no day off.", expect: "HOLD", ctx: "job_post" },
];

const sev = { ALLOW: 0, SOFTEN: 1, HOLD: 2, BLOCK: 3 };
let pass = 0;
let fail = 0;
for (const c of CASES) {
  const r = runRules(c.text, { contentType: c.ctx });
  // ALLOW cases may legitimately SOFTEN; everything else must reach the floor.
  const ok =
    c.expect === "ALLOW"
      ? r.action === "ALLOW" || r.action === "SOFTEN"
      : sev[r.action] >= sev[c.expect];
  if (ok) {
    pass++;
    console.log(`  ✓ [${r.action}] ${c.text.slice(0, 50)}`);
  } else {
    fail++;
    console.log(`  ✗ expected ≥${c.expect}, got ${r.action} — ${c.text.slice(0, 50)}`);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
