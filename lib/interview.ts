// Interview question system — types + scoring. Pure (no DB). Closed-bank:
// answers reference fixed option values, never free text about other people.

export type AnswerFormat = "single_select" | "yes_no" | "scale" | "short_structured";
export type QuestionCategory =
  | "reliability" | "experience" | "skills" | "availability" | "attitude" | "situational";
export type ScoringMode = "none" | "attach" | "rank";

export interface SelectOption {
  value: string;
  label: string;
  points: number;
}
export interface ScaleOptions {
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
}

export interface Question {
  id: string;
  role_scope: string[];
  category: QuestionCategory;
  prompt: string;
  answer_format: AnswerFormat;
  options: SelectOption[] | ScaleOptions | { maxLength: number };
  is_global: boolean;
  status: string;
  suggested_by: string | null;
}

export interface QuestionSet {
  id: string;
  job_id: string;
  question_ids: string[];
  required_ids: string[];
  scoring_mode: ScoringMode;
}

export interface RoleTemplate {
  id: string;
  key: string;
  name: string;
}

export const MIN_QUESTIONS = 3;
export const MAX_QUESTIONS = 8;
export const MAX_REQUIRED = 2;

export const CATEGORY_ORDER: QuestionCategory[] = [
  "reliability", "experience", "skills", "availability", "attitude", "situational",
];
export const CATEGORY_LABEL: Record<QuestionCategory, string> = {
  reliability: "Reliability",
  experience: "Experience",
  skills: "Skills",
  availability: "Availability",
  attitude: "Attitude & culture",
  situational: "Situational",
};

export const FORMAT_LABEL: Record<AnswerFormat, string> = {
  single_select: "Multiple choice",
  yes_no: "Yes / No",
  scale: "Scale 1–5",
  short_structured: "Short answer",
};

function isScale(q: Question): q is Question & { options: ScaleOptions } {
  return q.answer_format === "scale";
}
function selectOptions(q: Question): SelectOption[] {
  return Array.isArray(q.options) ? (q.options as SelectOption[]) : [];
}

/** Points an answer value earns for a question. */
export function answerPoints(q: Question, value: string): number {
  if (q.answer_format === "scale") return Number(value) || 0;
  if (q.answer_format === "short_structured") return 0;
  return selectOptions(q).find((o) => o.value === value)?.points ?? 0;
}

/** Max points a question can yield (0 for non-scored short answers). */
export function maxPoints(q: Question): number {
  if (q.answer_format === "scale") return isScale(q) ? q.options.max : 5;
  if (q.answer_format === "short_structured") return 0;
  return Math.max(0, ...selectOptions(q).map((o) => o.points));
}

/** Whether a (required) question's answer is a knockout failure. */
export function isKnockoutFail(q: Question, value: string): boolean {
  if (q.answer_format === "scale") return (Number(value) || 0) <= (isScale(q) ? q.options.min : 1);
  if (q.answer_format === "short_structured") return false;
  return answerPoints(q, value) === 0;
}

/** Is this question auto-scorable (eligible to be required/knockout)? */
export function isScorable(q: Question): boolean {
  return q.answer_format !== "short_structured";
}

/** Score an application from its answers. Returns 0–100 + knockout flag. */
export function scoreApplication(
  graded: { question: Question; value: string }[],
  requiredIds: string[],
): { score: number; knockedOut: boolean } {
  let got = 0;
  let max = 0;
  let knockedOut = false;
  for (const { question, value } of graded) {
    if (isScorable(question)) {
      got += answerPoints(question, value);
      max += maxPoints(question);
    }
    if (requiredIds.includes(question.id) && isKnockoutFail(question, value)) {
      knockedOut = true;
    }
  }
  const score = max > 0 ? Math.round((got / max) * 100) : 0;
  return { score, knockedOut };
}
