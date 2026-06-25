import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ModerationAction, ModerationContext, ModerationResult } from "./types";
import { ACTION_SEVERITY } from "./types";
import { runRules, redactExcerpt } from "./rules";
import { MODERATION_MODEL, MODERATION_SYSTEM_PROMPT } from "./prompt";
import { ALL_LEGAL_CODES, ALL_POLICY_CODES } from "./codes";

/** Most-severe merge: a hard rule BLOCK can never be downgraded by the model. */
function merge(rule: ModerationResult, llm: ModerationResult): ModerationResult {
  const winner =
    ACTION_SEVERITY[llm.action] > ACTION_SEVERITY[rule.action] ? llm : rule;
  return {
    action: winner.action,
    confidence: winner.confidence,
    legal_codes: [...new Set([...rule.legal_codes, ...llm.legal_codes])],
    policy_codes: [...new Set([...rule.policy_codes, ...llm.policy_codes])],
    escalate: rule.escalate || llm.escalate,
    reason_en: winner.reason_en,
    reason_th: winner.reason_th,
    suggested_rewrite: winner.action === "SOFTEN" ? winner.suggested_rewrite : null,
    contains_named_target: rule.contains_named_target || llm.contains_named_target,
    data_to_redact: [...new Set([...rule.data_to_redact, ...llm.data_to_redact])],
    model_version: winner === llm ? llm.model_version : rule.model_version,
  };
}

const VALID_ACTIONS: ModerationAction[] = ["ALLOW", "SOFTEN", "HOLD", "BLOCK"];

/** Call the classifier LLM. Returns null on any failure (engine falls back to rules). */
async function callClaude(text: string): Promise<ModerationResult | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODERATION_MODEL,
        max_tokens: 400,
        system: MODERATION_SYSTEM_PROMPT,
        messages: [{ role: "user", content: text.slice(0, 4000) }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.content?.[0]?.text ?? "";
    const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    const action = VALID_ACTIONS.includes(json.action) ? json.action : "HOLD";
    return {
      action,
      confidence: Number(json.confidence) || 0.5,
      legal_codes: (json.legal_codes ?? []).filter((c: string) => ALL_LEGAL_CODES.includes(c)),
      policy_codes: (json.policy_codes ?? []).filter((c: string) => ALL_POLICY_CODES.includes(c)),
      escalate: Boolean(json.escalate),
      reason_en: String(json.reason_en ?? "").slice(0, 280) || "Flagged by classifier.",
      reason_th: String(json.reason_th ?? "").slice(0, 280) || "ระบบตรวจพบความเสี่ยง",
      suggested_rewrite: json.suggested_rewrite ? String(json.suggested_rewrite) : null,
      contains_named_target: Boolean(json.contains_named_target),
      data_to_redact: Array.isArray(json.data_to_redact) ? json.data_to_redact : [],
      model_version: MODERATION_MODEL,
    };
  } catch {
    return null;
  }
}

/** Classify content without persisting (used by tests + the ops console preview). */
export async function classify(text: string, ctx: ModerationContext): Promise<ModerationResult> {
  const rule = runRules(text, ctx);
  // A hard BLOCK from the rules is final; otherwise let the model refine.
  if (rule.action === "BLOCK" && rule.escalate) return rule;
  const llm = await callClaude(text);
  return llm ? merge(rule, llm) : rule;
}

/**
 * Moderate content AND log the decision (audit + worker visibility). Returns the
 * result plus the decision id. Logging never blocks the action's outcome.
 */
export async function moderate(
  text: string,
  ctx: ModerationContext,
  supabase: SupabaseClient,
): Promise<{ result: ModerationResult; decisionId: string | null }> {
  const trimmed = (text ?? "").trim();
  if (!trimmed) {
    // Nothing to moderate — treat as allow, don't log.
    return {
      result: {
        action: "ALLOW",
        confidence: 1,
        legal_codes: [],
        policy_codes: [],
        escalate: false,
        reason_en: "Empty content.",
        reason_th: "ไม่มีเนื้อหา",
        suggested_rewrite: null,
        contains_named_target: false,
        data_to_redact: [],
        model_version: "rules-1",
      },
      decisionId: null,
    };
  }

  const result = await classify(trimmed, ctx);
  const hash = createHash("sha256").update(trimmed).digest("hex");

  const { data } = await supabase
    .from("moderation_decisions")
    .insert({
      content_type: ctx.contentType,
      content_ref: ctx.contentRef ?? null,
      content_hash: hash,
      excerpt: redactExcerpt(trimmed),
      action: result.action,
      confidence: result.confidence,
      legal_codes: result.legal_codes,
      policy_codes: result.policy_codes,
      escalate: result.escalate,
      reason_en: result.reason_en,
      reason_th: result.reason_th,
      suggested_rewrite: result.suggested_rewrite,
      author_id: ctx.authorId ?? null,
      target_id: ctx.targetId ?? null,
      model_version: result.model_version,
    })
    .select("id")
    .single();

  return { result, decisionId: data?.id ?? null };
}
