import { cn } from "./ui";
import type { ComplianceStatus } from "@/lib/compliance";

/**
 * Hiring-compliance trust signal. Deliberately labelled "self-attested" — the
 * employer confirms it themselves; Shifted hasn't audited their filings. Honest
 * by design (see CLAUDE.md: no opaque trust claims). Only renders when ready,
 * unless showProgress is set (employer's own dashboard).
 */
export function ComplianceBadge({
  status,
  className,
}: {
  status: ComplianceStatus;
  className?: string;
}) {
  if (status !== "ready") return null;
  return (
    <span
      title="The employer self-attests they meet Thailand's core hiring obligations (RD / SSO / DLPW). Not audited by SHIFTED."
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success",
        className,
      )}
    >
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 1.5l7 3v5c0 4.2-2.9 7.7-7 9-4.1-1.3-7-4.8-7-9v-5l7-3zm3.7 6.1l-1.1-1.1L9 10.2 7.4 8.6l-1.1 1.1L9 12.4z"
          clipRule="evenodd"
        />
      </svg>
      Compliance-ready
    </span>
  );
}
