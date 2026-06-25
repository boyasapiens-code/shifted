// Map DB rows → the symmetric matcher inputs. Uses the structured taxonomy
// fields where present (migration 0022) and derives sensible fallbacks from
// existing data (job role from title, worker roles from archetype) so matching
// produces useful scores before every field is filled in.
import { ROLE_FIT, deriveRole, type ArchetypeKey } from "@/lib/archetypes";
import {
  experienceTierFromYears,
  industriesForRoles,
  toHourlyTHB,
  type IndustryKey,
} from "./taxonomy";
import type { MatchJob, MatchWorker } from "./types";

export interface JobRow {
  title: string;
  role: string | null;
  industry: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_period: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  experience_required: number;
  experience_preferred: number | null;
  languages_required: string[];
  certs_required: string[] | null;
  days_needed: string[] | null;
  time_blocks_needed: string[] | null;
  hours_per_week: number | null;
  min_age: number | null;
  work_eligibility_required: string | null;
  status: string;
  boosted_until: string | null;
}

export interface CandidateRow {
  archetype: string | null;
  roles: string[] | null;
  industries?: string[] | null;
  years_experience: number;
  experience_tier: number | null;
  expected_rate_hourly: number | null;
  current_rate_hourly: number | null;
  rate_flexibility_pct: number | null;
  languages: string[];
  residence_district: string | null;
  preferred_districts: string[] | null;
  max_commute_minutes: number | null;
  available_days: string[] | null;
  available_time_blocks: string[] | null;
  desired_hours_per_week: number | null;
  work_eligibility: string | null;
  match_visibility: string | null;
  verification_level?: number | null;
}

/** Roles a worker is a strong archetype fit for (fallback when roles[] empty). */
function rolesFromArchetype(archetype: string | null): string[] {
  if (!archetype) return [];
  return Object.entries(ROLE_FIT)
    .filter(([, arch]) => arch.includes(archetype as ArchetypeKey))
    .map(([role]) => role);
}

export function jobToMatch(job: JobRow): MatchJob {
  const reqTier = experienceTierFromYears(job.experience_required);
  return {
    role: job.role ?? deriveRole(job.title),
    industry: job.industry as IndustryKey,
    payHourlyMin: toHourlyTHB(job.salary_min, job.salary_period),
    payHourlyMax: toHourlyTHB(job.salary_max, job.salary_period),
    district: job.district,
    lat: job.lat,
    lng: job.lng,
    experienceRequired: reqTier,
    experiencePreferred: job.experience_preferred ?? reqTier,
    languagesRequired: job.languages_required ?? [],
    certsRequired: job.certs_required ?? [],
    daysNeeded: job.days_needed ?? [],
    timeBlocksNeeded: job.time_blocks_needed ?? [],
    hoursPerWeek: job.hours_per_week,
    minAge: job.min_age ?? 18,
    workEligibilityRequired: (job.work_eligibility_required as MatchJob["workEligibilityRequired"]) ?? "any",
    status: job.status,
    isBoosted: job.boosted_until ? new Date(job.boosted_until) > new Date() : false,
  };
}

export function workerToMatch(c: CandidateRow): MatchWorker {
  const roles = c.roles && c.roles.length ? c.roles : rolesFromArchetype(c.archetype);
  const industries = (c.industries && c.industries.length
    ? c.industries
    : industriesForRoles(roles)) as IndustryKey[];
  return {
    roles,
    industries,
    expectedRateHourly: c.expected_rate_hourly,
    currentRateHourly: c.current_rate_hourly,
    rateFlexibilityPct: c.rate_flexibility_pct ?? 15,
    residenceDistrict: c.residence_district,
    lat: null, // PDPA §7 — worker precise location is never read for public scoring
    lng: null,
    preferredDistricts: c.preferred_districts ?? [],
    maxCommuteMinutes: c.max_commute_minutes,
    experienceTier: c.experience_tier ?? experienceTierFromYears(c.years_experience),
    languages: c.languages ?? [],
    certs: [],
    availableDays: c.available_days ?? [],
    availableTimeBlocks: c.available_time_blocks ?? [],
    desiredHoursPerWeek: c.desired_hours_per_week,
    age: null, // §7 — age is a legal gate only, never a public input
    workEligibility: (c.work_eligibility as MatchWorker["workEligibility"]) ?? null,
    visibility: (c.match_visibility as MatchWorker["visibility"]) ?? "open",
    verified: (c.verification_level ?? 0) >= 1,
  };
}
