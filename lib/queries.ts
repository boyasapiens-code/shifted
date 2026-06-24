import { createClient } from "./supabase/server";
import type {
  JobWithEmployer,
  Industry,
  EmploymentType,
  CandidateProfile,
} from "./types";

const JOB_SELECT =
  "*, employer:employer_profiles!inner(company_name, slug, logo_url, location, verification, verification_level, industry)";

export interface JobFilters {
  q?: string;
  industry?: Industry;
  employment_type?: EmploymentType;
  location?: string;
  salaryMin?: number;
  shiftWork?: boolean;
  employerMinLevel?: number;
  limit?: number;
}

/** Published jobs, newest first, with optional filters. Returns [] on failure. */
export async function getPublishedJobs(
  filters: JobFilters = {},
): Promise<JobWithEmployer[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("jobs")
      .select(JOB_SELECT)
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (filters.q) {
      query = query.or(`title.ilike.%${filters.q}%,description.ilike.%${filters.q}%`);
    }
    if (filters.industry) query = query.eq("industry", filters.industry);
    if (filters.employment_type)
      query = query.eq("employment_type", filters.employment_type);
    if (filters.location) query = query.ilike("location", `%${filters.location}%`);
    if (filters.salaryMin) query = query.gte("salary_max", filters.salaryMin);
    if (filters.shiftWork) query = query.eq("shift_work", true);
    if (filters.employerMinLevel)
      query = query.gte("employer.verification_level", filters.employerMinLevel);
    if (filters.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as JobWithEmployer[];
  } catch {
    return [];
  }
}

/** Open-to-work candidates for the talent directory. Visible to authed users;
 *  returns [] for signed-out visitors (RLS). */
export async function getOpenCandidates(
  q?: string,
  minLevel = 0,
): Promise<CandidateProfile[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("candidate_profiles")
      .select("*")
      .eq("open_to_work", true)
      .gte("verification_level", minLevel)
      // Most-verified first, then most reliable.
      .order("verification_level", { ascending: false })
      .order("reliability_score", { ascending: false, nullsFirst: false })
      .limit(48);
    if (q) {
      query = query.or(`headline.ilike.%${q}%,location.ilike.%${q}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as CandidateProfile[];
  } catch {
    return [];
  }
}

/** Single job with its employer. */
export async function getJob(id: string): Promise<JobWithEmployer | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("jobs")
      .select(JOB_SELECT)
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as JobWithEmployer;
  } catch {
    return null;
  }
}
