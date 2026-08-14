"use client";

import { useRef } from "react";
import { buttonClass } from "./ui";
import { reportContent } from "@/app/report/actions";
import type { ContentType } from "@/lib/moderation";
import type { Dict } from "@/lib/i18n";

const REASONS = ["defamation", "privacy", "harassment", "discrimination", "fraud", "other"] as const;

// Only the report-specific strings — NOT the whole jobDetail namespace.
// jobDetail also contains function values (e.g. experienceRequired), and
// this is a "use client" component: any prop crossing that boundary must
// be serializable, which a plain function value isn't (Next.js throws
// "Functions cannot be passed directly to Client Components" at runtime —
// this shipped once with the whole dict passed through, caught in local
// preview). Pick<> keeps this narrow and self-documenting.
type ReportDialogText = Pick<
  Dict["jobDetail"],
  | "reportJob"
  | "reportDialogTitle"
  | "reportReasonLabel"
  | "reportReasons"
  | "reportDetailLabel"
  | "reportDetailPlaceholder"
  | "reportConfidential"
  | "reportCancel"
  | "reportSubmit"
>;

/**
 * Report, as a real modal <dialog> — reason, details, cancel, and submit
 * states — instead of the faint text-link + <details> popover this used to
 * be. The native <dialog> element (via showModal()) gets focus trapping,
 * Escape-to-close, and a backdrop for free; a plain <button
 * onClick={close}> handles Cancel, and the actual Submit button is a real
 * form pointed at the same reportContent server action as before (same
 * hidden fields: content_type/content_ref/return_to) — reportContent
 * itself is untouched, only the UI around it changed.
 */
export function ReportDialog({
  contentType,
  contentRef,
  returnTo,
  t,
  triggerClassName,
}: {
  contentType: ContentType;
  contentRef?: string;
  returnTo: string;
  t: ReportDialogText;
  triggerClassName?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={triggerClassName ?? "block w-full rounded-[var(--radius-base)] px-3 py-2 text-left text-sm text-stone-600 hover:bg-stone-50"}
      >
        {t.reportJob}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="report-dialog-title"
        className="w-full max-w-sm rounded-[var(--radius-card)] border border-stone-200 bg-paper p-5 shadow-lg backdrop:bg-ink/40"
      >
        <form action={reportContent}>
          <input type="hidden" name="content_type" value={contentType} />
          {contentRef && <input type="hidden" name="content_ref" value={contentRef} />}
          <input type="hidden" name="return_to" value={returnTo} />

          <p id="report-dialog-title" className="text-base font-semibold text-ink">
            {t.reportDialogTitle}
          </p>

          <label className="mt-4 block text-sm font-medium text-ink" htmlFor="report-reason">
            {t.reportReasonLabel}
          </label>
          <select
            id="report-reason"
            name="reason"
            className="mt-1.5 w-full rounded-[var(--radius-base)] border border-stone-200 px-3 py-2 text-sm"
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {t.reportReasons[r]}
              </option>
            ))}
          </select>

          <label className="mt-4 block text-sm font-medium text-ink" htmlFor="report-detail">
            {t.reportDetailLabel}
          </label>
          <textarea
            id="report-detail"
            name="detail"
            rows={3}
            placeholder={t.reportDetailPlaceholder}
            className="mt-1.5 w-full rounded-[var(--radius-base)] border border-stone-200 px-3 py-2 text-sm"
          />

          <p className="mt-2 text-xs text-stone-400">{t.reportConfidential}</p>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className={buttonClass("ghost", "sm")}
            >
              {t.reportCancel}
            </button>
            <button type="submit" className={buttonClass("primary", "sm")}>
              {t.reportSubmit}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
