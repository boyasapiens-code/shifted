// Domain types mirroring supabase/migrations/0001_init.sql.

export type AccountRole = "candidate" | "employer" | "admin";

export type Industry =
  | "restaurant"
  | "cafe"
  | "bar"
  | "hotel"
  | "hostel"
  | "wellness"
  | "retail"
  | "lifestyle"
  | "cannabis"
  | "other";

export type EmploymentType = "full_time" | "part_time" | "contract" | "temporary";

export type JobStatus = "draft" | "published" | "closed";

export type ApplicationStatus =
  | "applied"
  | "shortlisted"
  | "interviewing"
  | "offered"
  | "hired"
  | "rejected"
  | "withdrawn";

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export interface Profile {
  id: string;
  role: AccountRole | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateProfile {
  id: string;
  full_name: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
  languages: string[];
  skills: string[];
  years_experience: number;
  availability: string | null;
  open_to_work: boolean;
  resume_url: string | null;
  portfolio_urls: string[];
  reliability_score: number | null;
  rating_avg: number | null;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export interface EmployerProfile {
  id: string;
  company_name: string;
  slug: string;
  industry: Industry;
  description: string | null;
  location: string | null;
  website: string | null;
  logo_url: string | null;
  cover_url: string | null;
  photos: string[];
  business_registered: boolean;
  salary_transparency: boolean;
  verification: VerificationStatus;
  rating_avg: number | null;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  employer_id: string;
  title: string;
  description: string;
  industry: Industry;
  location: string | null;
  employment_type: EmploymentType;
  shift_work: boolean;
  salary_min: number | null;
  salary_max: number | null;
  salary_period: string;
  languages_required: string[];
  experience_required: number;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface Application {
  id: string;
  job_id: string;
  candidate_id: string;
  status: ApplicationStatus;
  cover_note: string | null;
  created_at: string;
  updated_at: string;
}

export type EngagementStatus = "active" | "completed" | "cancelled";
export type AttendanceStatus = "pending" | "on_time" | "late" | "no_show";
export type ReviewKind = "of_worker" | "of_employer";

export interface Engagement {
  id: string;
  employer_id: string;
  worker_id: string;
  job_id: string | null;
  role_title: string | null;
  status: EngagementStatus;
  attendance: AttendanceStatus;
  started_on: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  engagement_id: string;
  author_id: string;
  subject_id: string;
  kind: ReviewKind;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  employer_id: string;
  full_name: string;
  role_title: string | null;
  net_salary: number | null;
  currency: string;
  period: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// A job joined with its employer — the common shape rendered in lists/details.
export type JobWithEmployer = Job & {
  employer: Pick<
    EmployerProfile,
    "company_name" | "slug" | "logo_url" | "location" | "verification" | "industry"
  > | null;
};
