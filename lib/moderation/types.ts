// Moderation engine — shared types. Output contract mirrors the classifier JSON
// in SHIFTED_AI_Moderation_Engine.md §4.

export type ModerationAction = "ALLOW" | "SOFTEN" | "HOLD" | "BLOCK";

export const ACTION_SEVERITY: Record<ModerationAction, number> = {
  ALLOW: 0,
  SOFTEN: 1,
  HOLD: 2,
  BLOCK: 3,
};

export type ContentType =
  | "review"
  | "response"
  | "message"
  | "job_post"
  | "profile"
  | "console";

export interface ModerationContext {
  contentType: ContentType;
  contentRef?: string | null;
  authorId?: string | null;
  targetId?: string | null; // the named party the content is about
}

export interface ModerationResult {
  action: ModerationAction;
  confidence: number;
  legal_codes: string[];
  policy_codes: string[];
  escalate: boolean;
  reason_en: string;
  reason_th: string;
  suggested_rewrite: string | null;
  contains_named_target: boolean;
  /** Field names detected for redaction (logged, never published). */
  data_to_redact: string[];
  /** Which classifier produced the final call. */
  model_version: string;
}
