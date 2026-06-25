import { buttonClass } from "./ui";
import { reportContent } from "@/app/report/actions";
import type { ContentType } from "@/lib/moderation";

const REASONS = ["defamation", "privacy", "harassment", "discrimination", "fraud", "other"];

/**
 * Confidential "Report" affordance. Server-rendered <details> + form — no client
 * JS needed. Drop it next to any user-generated content.
 */
export function ReportButton({
  contentType,
  contentRef,
  returnTo,
}: {
  contentType: ContentType;
  contentRef?: string;
  returnTo: string;
}) {
  return (
    <details className="group inline-block text-left">
      <summary className="cursor-pointer list-none text-xs text-stone-400 hover:text-stone-600 marker:hidden">
        Report
      </summary>
      <form
        action={reportContent}
        className="absolute z-10 mt-2 w-64 rounded-[var(--radius-card)] border border-stone-200 bg-paper p-4 shadow-lg"
      >
        <input type="hidden" name="content_type" value={contentType} />
        {contentRef && <input type="hidden" name="content_ref" value={contentRef} />}
        <input type="hidden" name="return_to" value={returnTo} />
        <p className="text-xs font-medium text-ink">Report this content</p>
        <select
          name="reason"
          className="mt-2 w-full rounded-[var(--radius-base)] border border-stone-200 px-2 py-1.5 text-sm"
        >
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r[0].toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
        <textarea
          name="detail"
          rows={2}
          placeholder="What's wrong? (optional)"
          className="mt-2 w-full rounded-[var(--radius-base)] border border-stone-200 px-2 py-1.5 text-sm"
        />
        <button className={buttonClass("outline", "sm") + " mt-2 w-full"} type="submit">
          Submit report
        </button>
        <p className="mt-1 text-[11px] text-stone-400">Reports are confidential.</p>
      </form>
    </details>
  );
}
