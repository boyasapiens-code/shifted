#!/usr/bin/env node
// Matching regression — the worked example from the spec §6 must score 97
// (Strong fit), plus hard-gate + pay-floor checks. Transpiles the TS sources
// (Node 20 can't import .ts) with the installed typescript package.
//
// Usage: node scripts/test-matching.mjs  (or: npm run test:matching)
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import ts from "typescript";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const opts = { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 };

function transpile(rel, out, rewrites = []) {
  let js = ts.transpileModule(readFileSync(join(root, rel), "utf8"), { compilerOptions: opts }).outputText;
  for (const [from, to] of rewrites) js = js.replaceAll(from, to);
  const p = join(__dirname, out);
  writeFileSync(p, js);
  return p;
}

const taxP = transpile("lib/matching/taxonomy.ts", ".tmp-taxonomy.mjs");
const scoreP = transpile("lib/matching/score.ts", ".tmp-score.mjs", [
  ['from "./taxonomy"', 'from "./.tmp-taxonomy.mjs"'],
  ["from './taxonomy'", "from './.tmp-taxonomy.mjs'"],
]);

let matchScore;
try {
  ({ matchScore } = await import(pathToFileURL(scoreP).href));
} finally {
  unlinkSync(taxP);
  unlinkSync(scoreP);
}

// §6 worked example: Café barista in Thonglor vs a junior barista in Ekkamai.
const job = {
  role: "barista", industry: "cafe", payHourlyMin: 90, payHourlyMax: 110,
  district: "thonglor", lat: 13.7303, lng: 100.5778,
  experienceRequired: 2, experiencePreferred: 3,
  languagesRequired: ["english"], certsRequired: [],
  daysNeeded: ["sat", "sun"], timeBlocksNeeded: ["evening"], hoursPerWeek: null,
  minAge: 18, workEligibilityRequired: "any", status: "published", isBoosted: false,
};
const worker = {
  roles: ["barista"], industries: ["cafe", "restaurant"],
  expectedRateHourly: 100, currentRateHourly: 95, rateFlexibilityPct: 15,
  residenceDistrict: "ekkamai", lat: 13.7220, lng: 100.5853, preferredDistricts: [],
  maxCommuteMinutes: null, experienceTier: 2, languages: ["english"], certs: [],
  availableDays: ["sat", "sun"], availableTimeBlocks: ["evening"], desiredHoursPerWeek: null,
  age: 25, workEligibility: "thai_national", visibility: "open", verified: true,
};

let pass = 0, fail = 0;
const check = (name, cond) => (cond ? (pass++, console.log(`  ✓ ${name}`)) : (fail++, console.log(`  ✗ ${name}`)));

const r = matchScore(job, worker);
check(`worked example scores 97 (got ${r.score})`, r.score === 97);
check(`band is 'strong' (got '${r.band}')`, r.band === "strong");
check("full confidence (all dimensions have data)", r.confidence === 1);
check("not gated", r.gated === false);

// Hard gate: hidden worker → gated, score 0.
const hidden = matchScore(job, { ...worker, visibility: "hidden" });
check("hidden worker is gated to 0", hidden.gated && hidden.score === 0);

// Hard gate: commute beyond tolerance.
const farJob = { ...job, lat: 13.95, lng: 100.95 };
const commuteGated = matchScore(farJob, { ...worker, maxCommuteMinutes: 20 });
check("commute beyond tolerance is gated", commuteGated.gated === true);

// Pay floor: offer well below current rate → low pay dimension.
const lowPay = matchScore({ ...job, payHourlyMin: 50, payHourlyMax: 60 }, worker);
const payDim = lowPay.dimensions.find((d) => d.key === "pay");
check(`low offer drops pay dimension (got ${payDim.score})`, payDim.score <= 0.4);
check(`low-pay total below worked example (got ${lowPay.score})`, lowPay.score < r.score);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
