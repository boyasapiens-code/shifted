// Domain types mirroring supabase/migrations/0001_init.sql.

export type AccountRole = "candidate" | "employer" | "admin";
export type AccountView = "worker" | "employer";

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
export type PlanTier = "free" | "pro";

export interface Profile {
  id: string;
  role: AccountRole | null;
  active_view: AccountView | null;
  is_admin: boolean;
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
  verification_level: number;
  reference_count: number;
  would_rehire_count: number;
  no_show_count: number;
  archetype: string | null;
  archetype_scores: Record<string, number> | null;
  archetype_taken_at: string | null;
  created_at: string;
  updated_at: string;
}

export type VerificationItemStatus = "submitted" | "approved" | "rejected";

export interface VerificationSubmission {
  id: string;
  candidate_id: string;
  level: number;
  status: VerificationItemStatus;
  details: string | null;
  evidence: Record<string, unknown>;
  documents: string[];
  reviewer_id: string | null;
  review_note: string | null;
  reviewed_at: string | null;
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
  verification_level: number;
  plan: PlanTier;
  plan_since: string | null;
  featured: boolean;
  response_rate: number | null;
  prompts_eligible: number;
  prompts_responded: number;
  rating_avg: number | null;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export interface HireReference {
  id: string;
  engagement_id: string;
  worker_id: string;
  employer_id: string;
  reliability: number;
  would_rehire: boolean;
  no_show: boolean;
  conduct_note: string | null;
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
  boosted_until: string | null;
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

export type SkillStatus = "self_declared" | "platform_verified" | "employer_verified";

export interface Skill {
  id: string;
  role: string;
  tier: number;
  name: string;
  slug: string;
  badge_name: string | null;
  is_gate: boolean;
  sort: number;
}

export interface WorkerSkill {
  id: string;
  worker_id: string;
  skill_id: string;
  status: SkillStatus;
  verified_by: string | null;
  engagement_id: string | null;
  verified_at: string | null;
}

export interface Conversation {
  id: string;
  employer_id: string;
  worker_id: string;
  job_id: string | null;
  last_message_at: string;
  employer_last_read_at: string | null;
  worker_last_read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
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
    | "company_name"
    | "slug"
    | "logo_url"
    | "location"
    | "verification"
    | "verification_level"
    | "featured"
    | "response_rate"
    | "industry"
  > | null;
};
