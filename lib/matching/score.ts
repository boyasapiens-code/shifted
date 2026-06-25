// Two-way matching (§5). One symmetric function: given a (Job, Worker) pair it
// returns match_score ∈ [0,100] + a per-dimension breakdown. A worker browsing
// jobs and an employer browsing workers see the SAME score for the same pair.
//
// Compliance (§7): age / gender / nationality / photo are NEVER inputs to the
// score. Age + work-eligibility are used ONLY as legal hard gates, never scored.
import { MATCH_WEIGHTS, ROLE_INDUSTRY_MAP, matchBand, type MatchBand } from "./taxonomy";
import type { MatchJob, MatchWorker, MatchResult, MatchDimension } from "./types";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Rough Bangkok commute estimate: haversine km → minutes (transit factor). */
export function estimateCommuteMinutes(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.max(5, Math.round(km * 5)); // ~5 min/km incl. BKK traffic
}

// 1 — Role + Industry
function roleIndustry(job: MatchJob, worker: MatchWorker): number | null {
  if (!job.role && worker.roles.length === 0) return null;
  let best = 0;
  const workerIndustries = new Set(worker.industries);
  for (const r of worker.roles) {
    let s = 0;
    if (job.role && r === job.role) s = 1.0;
    else if ((ROLE_INDUSTRY_MAP[r] ?? []).includes(job.industry)) s = 0.6;
    else if (workerIndustries.has(job.industry)) s = 0.3;
    best = Math.max(best, s);
  }
  // Worker has no roles but shares the industry interest.
  if (best === 0 && workerIndustries.has(job.industry)) best = 0.3;
  return best;
}

// 2 — Pay overlap (does the offer meet the worker's expectation?)
function pay(job: MatchJob, worker: MatchWorker): number | null {
  if (job.payHourlyMax == null || worker.expectedRateHourly == null) return null;
  const floor = worker.expectedRateHourly * (1 - worker.rateFlexibilityPct / 100);
  if (job.payHourlyMax >= worker.expectedRateHourly) return 1.0;
  if (job.payHourlyMax >= floor) {
    const span = worker.expectedRateHourly - floor || 1;
    return clamp01(0.6 + 0.3 * ((job.payHourlyMax - floor) / span));
  }
  if (worker.currentRateHourly != null && job.payHourlyMax >= worker.currentRateHourly) return 0.4;
  return 0.1;
}

// 3 — Location / commute
function location(job: MatchJob, worker: MatchWorker): number | null {
  if (job.lat != null && job.lng != null && worker.lat != null && worker.lng != null) {
    const mins = estimateCommuteMinutes(
      { lat: job.lat, lng: job.lng },
      { lat: worker.lat, lng: worker.lng },
    );
    let s = mins <= 15 ? 1.0 : mins <= 30 ? 0.8 : mins <= 45 ? 0.6 : mins <= 60 ? 0.4 : 0.1;
    if (job.district && worker.preferredDistricts.includes(job.district)) s = clamp01(s + 0.1);
    return s;
  }
  // No coordinates — fall back to district preference if available.
  if (job.district && worker.preferredDistricts.length) {
    return worker.preferredDistricts.includes(job.district) ? 1.0 : 0.3;
  }
  return null;
}

// 4 — Availability overlap (% of the job's required slots the worker can cover)
function availability(job: MatchJob, worker: MatchWorker): number | null {
  if (!job.daysNeeded.length || !job.timeBlocksNeeded.length) return null;
  if (!worker.availableDays.length && !worker.availableTimeBlocks.length) return null;
  const wDays = new Set(worker.availableDays);
  const wBlocks = new Set(worker.availableTimeBlocks);
  let required = 0;
  let covered = 0;
  for (const d of job.daysNeeded) {
    for (const b of job.timeBlocksNeeded) {
      required++;
      if (wDays.has(d) && wBlocks.has(b)) covered++;
    }
  }
  let s = required === 0 ? 1 : covered / required;
  // Hours sanity: penalize if the job wants >30% more hours than desired.
  if (job.hoursPerWeek != null && worker.desiredHoursPerWeek != null && worker.desiredHoursPerWeek > 0) {
    if (job.hoursPerWeek > worker.desiredHoursPerWeek * 1.3) s *= 0.8;
  }
  return clamp01(s);
}

// 5 — Experience fit (ordinal tiers)
function experience(job: MatchJob, worker: MatchWorker): number | null {
  const t = worker.experienceTier;
  if (t >= job.experiencePreferred) {
    return t >= job.experiencePreferred + 2 ? 0.9 : 1.0; // mild overqualified penalty
  }
  if (t >= job.experienceRequired) return 0.7;
  if (t === job.experienceRequired - 1) return 0.3;
  return 0.0;
}

// 6 — Languages / certs
function languagesCerts(job: MatchJob, worker: MatchWorker): number | null {
  const needLang = job.languagesRequired.length > 0;
  const needCert = job.certsRequired.length > 0;
  if (!needLang && !needCert) return null; // nothing required → neutral, no data
  const wl = new Set(worker.languages.map((l) => l.toLowerCase()));
  const wc = new Set(worker.certs.map((c) => c.toLowerCase()));
  const lang = needLang
    ? job.languagesRequired.filter((l) => wl.has(l.toLowerCase())).length / job.languagesRequired.length
    : 1;
  const cert = needCert
    ? job.certsRequired.filter((c) => wc.has(c.toLowerCase())).length / job.certsRequired.length
    : 1;
  if (needLang && needCert) return 0.6 * lang + 0.4 * cert;
  return needLang ? lang : cert;
}

/** Hard gates (§5.3): auto-fail → hidden regardless of score. */
function hardGate(job: MatchJob, worker: MatchWorker): string | null {
  if (job.status !== "published" && job.status !== "active") return "Job is not active";
  if (worker.visibility === "hidden") return "Worker is hidden";
  if (job.minAge != null && worker.age != null && worker.age < job.minAge) return "Below minimum age";
  if (
    job.workEligibilityRequired === "thai_national" &&
    worker.workEligibility &&
    worker.workEligibility !== "thai_national"
  )
    return "Work eligibility mismatch";
  if (job.lat != null && worker.lat != null && worker.maxCommuteMinutes != null) {
    const mins = estimateCommuteMinutes(
      { lat: job.lat, lng: job.lng! },
      { lat: worker.lat, lng: worker.lng! },
    );
    if (mins > worker.maxCommuteMinutes) return "Beyond commute tolerance";
  }
  return null;
}

const NEUTRAL = 0.6; // score used for a missing dimension so gaps don't tank the total

export function matchScore(job: MatchJob, worker: MatchWorker): MatchResult {
  const gate = hardGate(job, worker);

  const raw: { key: keyof typeof MATCH_WEIGHTS; label: string; score: number | null; note: string }[] = [
    { key: "role_industry", label: "Role & industry", score: roleIndustry(job, worker), note: "Can they do this role?" },
    { key: "pay", label: "Pay", score: pay(job, worker), note: "Does the offer meet their rate?" },
    { key: "location", label: "Location", score: location(job, worker), note: "Commute / district fit." },
    { key: "availability", label: "Availability", score: availability(job, worker), note: "Shift coverage." },
    { key: "experience", label: "Experience", score: experience(job, worker), note: "Tier vs requirement." },
    { key: "languages_certs", label: "Languages & certs", score: languagesCerts(job, worker), note: "Required languages / certs." },
  ];

  let rawTotal = 0;
  let nonNull = 0;
  const dimensions: MatchDimension[] = raw.map((d) => {
    const w = MATCH_WEIGHTS[d.key];
    if (d.score != null) nonNull++;
    rawTotal += (d.score ?? NEUTRAL) * w;
    return { key: d.key, label: d.label, weight: w, score: d.score, note: d.note };
  });

  const score = gate ? 0 : Math.round(rawTotal);
  const band: MatchBand = gate ? "hide" : matchBand(score);
  return {
    score,
    band,
    confidence: nonNull / raw.length,
    gated: Boolean(gate),
    gateReason: gate,
    dimensions,
  };
}
