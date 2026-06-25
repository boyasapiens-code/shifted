// Trust Circle — shared types, labels, and structured field definitions.
// The rating fields here ARE the allowlist (no free-text-about-worker, no comp).
// See supabase/migrations/0019_trust_circle.sql for the enforced invariants.

export type TcMemberStatus = "pending" | "probation" | "active" | "suspended" | "exited";
export type TcMemberTier = "growth" | "trust_circle";
export type TcConsentScope = "pool_discoverable" | "reference_sharing" | "endorsement_visible";
export type TcConsentStatus = "active" | "withdrawn";
export type TcRefStatus = "pending" | "answered" | "declined" | "blocked_no_consent";
export type TcResponseTarget = "endorsement" | "reference";
export type TcAccessAction = "search_hit" | "view_profile" | "view_endorsement" | "view_reference";

export interface TcMember {
  id: string;
  employer_id: string;
  status: TcMemberStatus;
  ndsca_signed_at: string | null;
  ndsca_version: string | null;
  tier: TcMemberTier;
  trust_score: number | null;
}

export interface TcConsent {
  id: string;
  worker_id: string;
  scope: TcConsentScope;
  status: TcConsentStatus;
  granted_at: string;
  withdrawn_at: string | null;
}

export interface TcEndorsement {
  id: string;
  worker_id: string;
  member_id: string;
  role_confirmed: string;
  employed_from: string | null;
  employed_to: string | null;
  rating_reliability: number;
  rating_skill: number;
  rating_teamwork: number;
  rating_punctuality: number;
  would_rehire: boolean;
  created_at: string;
}

export interface TcReferenceRequest {
  id: string;
  worker_id: string;
  requesting_member_id: string;
  responding_member_id: string | null;
  status: TcRefStatus;
  role_confirmed: string | null;
  rating_reliability: number | null;
  rating_skill: number | null;
  rating_teamwork: number | null;
  rating_punctuality: number | null;
  would_rehire: boolean | null;
  answered_at: string | null;
  created_at: string;
}

export interface TcResponse {
  id: string;
  worker_id: string;
  target_type: TcResponseTarget;
  target_id: string;
  body: string;
  created_at: string;
}

export interface TcAccessLogRow {
  id: string;
  worker_id: string;
  member_id: string;
  action: TcAccessAction;
  created_at: string;
}

export interface TcSearchHit {
  worker_id: string;
  full_name: string | null;
  headline: string | null;
  location: string | null;
  endorsement_count: number;
  avg_reliability: number | null;
  would_rehire_count: number;
}

/** The structured ratings — the complete allowlist of what may be said. */
export const TC_RATING_FIELDS = [
  { key: "rating_reliability", label: "Reliability" },
  { key: "rating_skill", label: "Skill" },
  { key: "rating_teamwork", label: "Teamwork" },
  { key: "rating_punctuality", label: "Punctuality" },
] as const;

/** Consent scopes with plain Thai + English copy for the opt-in screen. */
export const TC_CONSENT_SCOPES: {
  scope: TcConsentScope;
  title: string;
  title_th: string;
  desc: string;
  desc_th: string;
}[] = [
  {
    scope: "pool_discoverable",
    title: "Be discoverable in the talent pool",
    title_th: "ให้ค้นพบในกลุ่มผู้สมัคร",
    desc: "Member employers can find your profile when searching for people to hire.",
    desc_th: "นายจ้างที่เป็นสมาชิกสามารถค้นพบโปรไฟล์ของคุณเมื่อกำลังหาคนทำงาน",
  },
  {
    scope: "endorsement_visible",
    title: "Show endorsements from past managers",
    title_th: "แสดงการรับรองจากหัวหน้างานเดิม",
    desc: "Structured ratings (reliability, skill, teamwork, punctuality) from employers who managed you become visible to members.",
    desc_th: "คะแนนแบบมีโครงสร้าง (ความน่าเชื่อถือ ทักษะ การทำงานเป็นทีม ตรงต่อเวลา) จากนายจ้างที่เคยดูแลคุณจะแสดงต่อสมาชิก",
  },
  {
    scope: "reference_sharing",
    title: "Allow structured reference requests",
    title_th: "อนุญาตให้ขออ้างอิงแบบมีโครงสร้าง",
    desc: "A member considering hiring you may request a structured reference from a past employer.",
    desc_th: "สมาชิกที่กำลังพิจารณาจ้างคุณสามารถขออ้างอิงแบบมีโครงสร้างจากนายจ้างเดิมได้",
  },
];

export const TC_ACCESS_ACTION_LABEL: Record<TcAccessAction, string> = {
  search_hit: "Appeared in a search",
  view_profile: "Viewed your profile",
  view_endorsement: "Viewed your endorsements",
  view_reference: "Viewed a reference",
};

export const TC_STATUS_LABEL: Record<TcMemberStatus, string> = {
  pending: "Pending",
  probation: "Probation",
  active: "Active",
  suspended: "Suspended",
  exited: "Exited",
};

export const NDSCA_VERSION = "2026-06";
