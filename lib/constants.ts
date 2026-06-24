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
