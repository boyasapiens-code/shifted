import type { EmploymentType, Industry, ApplicationStatus, PlanTier } from "./types";

export const INDUSTRIES: { value: Industry; label: string }[] = [
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Café" },
  { value: "bar", label: "Bar" },
  { value: "hotel", label: "Hotel" },
  { value: "hostel", label: "Hostel" },
  { value: "wellness", label: "Wellness" },
  { value: "retail", label: "Retail" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "cannabis", label: "Cannabis" },
  { value: "other", label: "Other" },
];

export const INDUSTRY_LABEL: Record<Industry, string> = Object.fromEntries(
  INDUSTRIES.map((i) => [i.value, i.label]),
) as Record<Industry, string>;

export const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "temporary", label: "Temporary" },
];

export const EMPLOYMENT_TYPE_LABEL: Record<EmploymentType, string> =
  Object.fromEntries(
    EMPLOYMENT_TYPES.map((t) => [t.value, t.label]),
  ) as Record<EmploymentType, string>;

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  interviewing: "Interviewing",
  offered: "Offered",
  hired: "Hired",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
};

export const VERIFICATION_LEVELS: {
  level: number;
  name: string;
  blurb: string;
  hint: string;
}[] = [
  {
    level: 1,
    name: "Identity & basics",
    blurb: "A real, legally employable person.",
    hint: "Your ID/passport number, work permit, and any required certifications. Upload clear photos of each document.",
  },
  {
    level: 2,
    name: "Online persona",
    blurb: "An authentic, consistent digital footprint.",
    hint: "Links to your social / professional profiles (Instagram, Facebook, LINE, LinkedIn, TikTok…).",
  },
  {
    level: 3,
    name: "Credentials & history",
    blurb: "A true, verified track record.",
    hint: "Education, work history, and reference/endorsement letters. Upload letters where you have them.",
  },
  {
    level: 4,
    name: "Skills & attitude",
    blurb: "Proven skills and team fit.",
    hint: "Tell us about your skills and experience. A short assessment confirms them and surfaces your working style.",
  },
];

export const VERIFICATION_LEVEL_NAME: Record<number, string> = Object.fromEntries(
  VERIFICATION_LEVELS.map((l) => [l.level, l.name]),
);

export const EMPLOYER_VERIFICATION_LAYERS: {
  level: number;
  name: string;
  blurb: string;
  hint: string;
}[] = [
  {
    level: 1,
    name: "Legal & compliance",
    blurb: "A real, registered, compliant business.",
    hint: "DBD company registration, VAT registration (if applicable), social security registration, and other official documents.",
  },
  {
    level: 2,
    name: "Online presence",
    blurb: "A real, active, consistent business.",
    hint: "Your official website, Google Business listing, and social channels.",
  },
  {
    level: 3,
    name: "Customer reviews",
    blurb: "A genuine, functioning operation.",
    hint: "Verified customer feedback and testimonials (links or uploads).",
  },
  {
    level: 4,
    name: "Peer & partner reviews",
    blurb: "Credible to those who've worked with you.",
    hint: "References from business partners, suppliers, and peers.",
  },
];

export const EMPLOYER_VERIFICATION_LAYER_NAME: Record<number, string> =
  Object.fromEntries(EMPLOYER_VERIFICATION_LAYERS.map((l) => [l.level, l.name]));

// Outcome-aligned pricing: employers are billed on outcomes, not clicks.
export const OUTCOME_PRICING: Record<
  string,
  { label: string; amount: number; blurb: string }
> = {
  hire_confirmed: { label: "Confirmed hire", amount: 1500, blurb: "When a placement starts" },
  retention_30: { label: "Stayed 30 days", amount: 500, blurb: "Worker still on the team" },
  retention_60: { label: "Stayed 60 days", amount: 500, blurb: "Worker still on the team" },
  retention_90: { label: "Stayed 90 days", amount: 1000, blurb: "Retention milestone" },
  qualified_match: { label: "Qualified match", amount: 0, blurb: "Accepted match" },
};

export const RETENTION_STAGES: { type: string; label: string }[] = [
  { type: "retention_30", label: "Day 30" },
  { type: "retention_60", label: "Day 60" },
  { type: "retention_90", label: "Day 90" },
];

/** Is a job currently boosted (promoted)? */
export function isBoosted(boostedUntil: string | null | undefined): boolean {
  return !!boostedUntil && new Date(boostedUntil).getTime() > Date.now();
}

// Employer subscription tiers (CLAUDE.md: Free / Starter ฿990 / Growth ฿2,490).
// Enum value 'pro' is the Starter tier. Prices are test hypotheses.
export const PLANS: {
  key: PlanTier;
  name: string;
  price: number;
  features: string[];
}[] = [
  {
    key: "free",
    name: "Free",
    price: 0,
    features: [
      "Post jobs & review applicants",
      "Verification & reference network",
      "Two-way reviews",
    ],
  },
  {
    key: "pro",
    name: "Starter",
    price: 990,
    features: [
      "Featured employer placement",
      "Priority in candidate discovery",
      "Discounted job boosts",
    ],
  },
  {
    key: "growth",
    name: "Growth",
    price: 2490,
    features: [
      "Everything in Starter",
      "Workforce insights & pay benchmarks",
      "Bundled SOPs & training",
      "Priority support",
    ],
  },
];

export const PLAN_NAME: Record<PlanTier, string> = {
  free: "Free",
  pro: "Starter",
  growth: "Growth",
};

/** A boost is standalone pay-per-use (the lowest-friction first revenue). */
export const BOOST_PRICE = 299; // THB, within the 199–499 test range
export const BOOST_DAYS = 30; // how long a single boost promotes a job

/** Is the employer on a paid subscription tier? */
export function isPaidPlan(plan: PlanTier | null | undefined): boolean {
  return plan === "pro" || plan === "growth";
}

/** Format a job's salary range as a compact THB string. */
export function formatSalary(
  min: number | null,
  max: number | null,
  period: string,
): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) => `฿${n.toLocaleString("en-US")}`;
  const range =
    min != null && max != null
      ? `${fmt(min)}–${fmt(max)}`
      : fmt((min ?? max) as number);
  const per =
    period === "hour" ? "/hr" : period === "day" ? "/day" : "/mo";
  return `${range}${per}`;
}

/** A URL-safe slug from a company name (best-effort; uniqueness enforced by DB). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}
