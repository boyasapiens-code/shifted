export * from "./types";
export * from "./codes";
export { classify, moderate } from "./engine";
export { MODERATION_MODEL } from "./prompt";

import type { SupabaseClient } from "@supabase/supabase-js";
import { moderate } from "./engine";
import type { ContentType, ModerationAction } from "./types";

/**
 * Moderate a free-text comment and resolve how to store it:
 *  - BLOCK → drop the comment, status 'blocked'
 *  - HOLD  → keep it but hide it ('held') until a human reviews
 *  - SOFTEN/ALLOW → publish, status 'softened'/'allowed'
 * Returns the comment to persist + its status + the engine action (for UX).
 */
export async function moderateComment(
  comment: string,
  ctx: {
    contentType: ContentType;
    contentRef?: string | null;
    authorId?: string | null;
    targetId?: string | null;
  },
  supabase: SupabaseClient,
): Promise<{ comment: string | null; status: string; action: ModerationAction }> {
  const text = (comment ?? "").trim();
  if (!text) return { comment: null, status: "allowed", action: "ALLOW" };
  const { result } = await moderate(text, ctx, supabase);
  switch (result.action) {
    case "BLOCK":
      return { comment: null, status: "blocked", action: "BLOCK" };
    case "HOLD":
      return { comment: text, status: "held", action: "HOLD" };
    case "SOFTEN":
      return { comment: text, status: "softened", action: "SOFTEN" };
    default:
      return { comment: text, status: "allowed", action: "ALLOW" };
  }
}
