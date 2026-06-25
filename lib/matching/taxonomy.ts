// Shared matching taxonomy — defined ONCE and reused by both Job and Worker so
// matching is apples-to-apples (SHIFTED_Categorization_Matching_Spec.md §1).
// Built over the repo's REAL vocab (industry enum + archetype role keys), not
// the spec's idealized lists — per "follow the repo, flag the conflict."

// Industries = the existing `industry` enum.
export const INDUSTRIES = [
  "restaurant", "cafe", "bar", "hotel", "hostel",
  "wellness", "retail", "lifestyle", "cannabis", "other",
] as const;
export type IndustryKey = (typeof INDUSTRIES)[number];

// Roles = the existing archetype role keys (lib/archetypes ROLE_FIT).
export const ROLES = [
  "budtender", "barista", "server", "bartender", "host",
  "retail", "cashier", "cook", "manager", "supervisor",
] as const;
export type RoleKey = (typeof ROLES)[number];

// Which industries each role belongs to (used for the Role+Industry dimension).
export const ROLE_INDUSTRY_MAP: Record<string, IndustryKey[]> = {
  budtender: ["cannabis"],
  barista: ["cafe", "restaurant"],
  server: ["restaurant", "bar", "hotel"],
  bartender: ["bar", "hotel", "restaurant"],
  host: ["restaurant", "hotel", "bar"],
  retail: ["retail", "lifestyle", "cannabis"],
  cashier: ["retail", "cafe", "restaurant"],
  cook: ["restaurant", "hotel", "cafe"],
  manager: ["restaurant", "cafe", "bar", "hotel", "retail", "wellness", "cannabis", "lifestyle"],
  supervisor: ["restaurant", "cafe", "bar", "hotel", "retail", "wellness", "cannabis", "lifestyle"],
};

/** Industries a worker is plausibly open to, from the roles they can do. */
export function industriesForRoles(roles: string[]): IndustryKey[] {
  const set = new Set<IndustryKey>();
  for (const r of roles) for (const i of ROLE_INDUSTRY_MAP[r] ?? []) set.add(i);
  return [...set];
}

// Experience tiers — ordinal (§1.4). Comparisons use the numeric tier.
export const EXPERIENCE_TIERS = [
  { tier: 0, code: "no_experience", label: "No experience" },
  { tier: 1, code: "trainee", label: "Trainee (<6mo)" },
  { tier: 2, code: "junior", label: "Junior (6mo–2y)" },
  { tier: 3, code: "experienced", label: "Experienced (2–5y)" },
  { tier: 4, code: "senior", label: "Senior (5y+)" },
  { tier: 5, code: "lead_manager", label: "Lead / manager" },
] as const;

/** Map free-text years of experience to an ordinal tier. */
export function experienceTierFromYears(years: number | null | undefined): number {
  const y = years ?? 0;
  if (y <= 0) return 1; // assume some exposure unless flagged no_experience
  if (y < 2) return 2;
  if (y < 5) return 3;
  return 4;
}

export const TIME_BLOCKS = ["morning", "midday", "afternoon", "evening", "late_night"] as const;
export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

// Canonical pay unit = hourly THB. Convert daily/monthly with shift assumptions.
const SHIFT_HOURS = 8;
const WORK_DAYS_PER_MONTH = 26;
export function toHourlyTHB(
  amount: number | null | undefined,
  period: string | null | undefined,
): number | null {
  if (amount == null) return null;
  switch (period) {
    case "hour":
      return Math.round(amount);
    case "day":
      return Math.round(amount / SHIFT_HOURS);
    case "month":
      return Math.round(amount / WORK_DAYS_PER_MONTH / SHIFT_HOURS);
    default:
      return Math.round(amount);
  }
}

// Display bands (§5.4).
export type MatchBand = "strong" | "good" | "maybe" | "hide";
export function matchBand(score: number): MatchBand {
  if (score >= 90) return "strong";
  if (score >= 70) return "good";
  if (score >= 50) return "maybe";
  return "hide";
}
export const BAND_LABEL: Record<MatchBand, string> = {
  strong: "Strong fit",
  good: "Good fit",
  maybe: "Worth a look",
  hide: "Low fit",
};

// Dimension weights (§5.1). Tunable constants — start here, calibrate on hires.
export const MATCH_WEIGHTS = {
  role_industry: 25,
  pay: 20,
  location: 20,
  availability: 20,
  experience: 10,
  languages_certs: 5,
} as const;
