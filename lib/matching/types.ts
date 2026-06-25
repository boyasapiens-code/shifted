import type { IndustryKey, MatchBand } from "./taxonomy";

// Symmetric inputs — the SAME shared taxonomy powers both sides (§2/§3).

export interface MatchJob {
  role: string | null;
  industry: IndustryKey;
  payHourlyMin: number | null;
  payHourlyMax: number | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  experienceRequired: number; // tier
  experiencePreferred: number; // tier
  languagesRequired: string[];
  certsRequired: string[];
  daysNeeded: string[];
  timeBlocksNeeded: string[];
  hoursPerWeek: number | null;
  minAge: number | null;
  workEligibilityRequired: "thai_national" | "work_permit_ok" | "any" | null;
  status: string;
  isBoosted: boolean;
}

export interface MatchWorker {
  roles: string[];
  industries: IndustryKey[];
  expectedRateHourly: number | null;
  currentRateHourly: number | null;
  rateFlexibilityPct: number;
  residenceDistrict: string | null;
  lat: number | null;
  lng: number | null;
  preferredDistricts: string[];
  maxCommuteMinutes: number | null;
  experienceTier: number;
  languages: string[];
  certs: string[];
  availableDays: string[];
  availableTimeBlocks: string[];
  desiredHoursPerWeek: number | null;
  age: number | null;
  workEligibility: "thai_national" | "work_permit" | "student_visa" | null;
  visibility: "open" | "passive" | "hidden";
  verified: boolean;
}

export interface MatchDimension {
  key: string;
  label: string;
  weight: number;
  /** 0–1, or null when neither side supplied the data (lowers confidence). */
  score: number | null;
  note: string;
}

export interface MatchResult {
  score: number; // 0–100
  band: MatchBand;
  confidence: number; // 0–1, fraction of dimensions with data on both sides
  gated: boolean; // hard-fail → hide regardless of score
  gateReason: string | null;
  dimensions: MatchDimension[];
}
