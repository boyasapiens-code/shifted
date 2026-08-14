import { createClient } from "./supabase/server";
import type {
  JobWithEmployer,
  Industry,
  EmploymentType,
  CandidateProfile,
} from "./types";

const JOB_SELECT =
  "*, employer:employer_profiles!inner(company_name, slug, logo_url, location, verification, verification_level, featured, response_rate, industry)";

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

async function buildPublishedJobsQuery(filters: JobFilters) {
  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select(JOB_SELECT)
    .eq("status", "published")
    // Boosted (promoted) jobs surface first, then newest.
    .order("boosted_until", { ascending: false, nullsFirst: false })
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
  return query;
}

/** Published jobs, newest first, with optional filters. Returns [] on failure. */
export async function getPublishedJobs(
  filters: JobFilters = {},
): Promise<JobWithEmployer[]> {
  try {
    const { data, error } = await buildPublishedJobsQuery(filters);
    if (error) throw error;
    return (data ?? []) as JobWithEmployer[];
  } catch {
    return [];
  }
}

/**
 * Same query as getPublishedJobs, but distinguishes "zero results" from "the
 * query failed" — getPublishedJobs() alone can't (it swallows errors into
 * the same empty array other callers already depend on), and the jobs index
 * needs a real "search error" state distinct from a genuine no-results
 * empty state. Additive — getPublishedJobs()'s existing callers/shape are
 * untouched.
 */
export async function getPublishedJobsWithStatus(
  filters: JobFilters = {},
): Promise<{ jobs: JobWithEmployer[]; error: boolean }> {
  try {
    const { data, error } = await buildPublishedJobsQuery(filters);
    if (error) throw error;
    return { jobs: (data ?? []) as JobWithEmployer[], error: false };
  } catch {
    return { jobs: [], error: true };
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

/** Verified-skill summary (count + badge names) for a set of workers. */
export async function getVerifiedSkillSummaries(
  workerIds: string[],
): Promise<Map<string, { count: number; badges: string[] }>> {
  const map = new Map<string, { count: number; badges: string[] }>();
  if (!workerIds.length) return map;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("worker_skills")
      .select("worker_id, skill:skills(badge_name)")
      .eq("status", "employer_verified")
      .in("worker_id", workerIds);
    for (const r of data ?? []) {
      const cur = map.get(r.worker_id) ?? { count: 0, badges: [] };
      cur.count += 1;
      const sk = Array.isArray(r.skill) ? r.skill[0] : r.skill;
      if (sk?.badge_name) cur.badges.push(sk.badge_name);
      map.set(r.worker_id, cur);
    }
  } catch {
    // best-effort
  }
  return map;
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

/** Job ids a candidate has saved — for cheap "is this saved?" checks across
 *  a whole grid without re-querying per card. Empty set on any failure
 *  (including signed-out, where the caller shouldn't be asking anyway). */
export async function getSavedJobIds(candidateId: string): Promise<Set<string>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("saved_jobs")
      .select("job_id")
      .eq("candidate_id", candidateId);
    if (error) throw error;
    return new Set((data ?? []).map((r) => r.job_id as string));
  } catch {
    return new Set();
  }
}

/** A few other published jobs in the same industry, for the job-detail
 *  page's "Similar jobs" section. Real query (not fabricated) — genuinely
 *  excludes the current job, only surfaces if there's real data to show. */
export async function getSimilarJobs(
  industry: Industry,
  excludeId: string,
  limit = 3,
): Promise<JobWithEmployer[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("jobs")
      .select(JOB_SELECT)
      .eq("status", "published")
      .eq("industry", industry)
      .neq("id", excludeId)
      .order("boosted_until", { ascending: false, nullsFirst: false })
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as JobWithEmployer[];
  } catch {
    return [];
  }
}

/** A candidate's saved jobs, most recently saved first. For /candidate/saved. */
export async function getSavedJobs(candidateId: string): Promise<JobWithEmployer[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("saved_jobs")
      .select(`created_at, job:jobs!inner(${JOB_SELECT})`)
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? [])
      .map((r) => (Array.isArray(r.job) ? r.job[0] : r.job))
      .filter(Boolean) as unknown as JobWithEmployer[];
  } catch {
    return [];
  }
}
