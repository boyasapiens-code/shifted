import type { EmploymentType, Industry, ApplicationStatus } from "./types";

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

/** Is a job currently boosted (promoted)? */
export function isBoosted(boostedUntil: string | null | undefined): boolean {
  return !!boostedUntil && new Date(boostedUntil).getTime() > Date.now();
}

export const PRO_FEATURES: string[] = [
  "Boost jobs to the top of search",
  "Featured employer placement",
  "Priority in candidate discovery",
  "Unlimited active job posts",
];

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
