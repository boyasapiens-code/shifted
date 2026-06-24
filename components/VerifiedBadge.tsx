import type { VerificationStatus } from "@/lib/types";
import { cn } from "./ui";

/** The verification mark that signals a vetted employer. Trust is a feature. */
export function VerifiedBadge({
  status,
  className,
}: {
  status: VerificationStatus;
  className?: string;
}) {
  if (status !== "verified") return null;
  return (
    <span
      title="Verified employer"
      className={cn("inline-flex items-center gap-1 text-signal", className)}
    >
      <svg
        viewBox="0 0 20 20"
        className="h-4 w-4"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 1.5l2.1 1.4 2.5-.3 1 2.3 2 1.6-.7 2.4.7 2.4-2 1.6-1 2.3-2.5-.3L10 18.5l-2.1-1.4-2.5.3-1-2.3-2-1.6.7-2.4-.7-2.4 2-1.6 1-2.3 2.5.3L10 1.5zm-1 11.7l4.2-4.2-1.1-1.1L9 11l-1.6-1.6-1.1 1.1L9 13.2z"
          clipRule="evenodd"
        />
      </svg>
      <span className="text-xs font-medium">Verified</span>
    </span>
  );
}
