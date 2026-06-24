import { VERIFICATION_LEVEL_NAME } from "@/lib/constants";
import { cn } from "./ui";

/**
 * Trust badge reflecting a candidate's verified-screening level (0–4).
 * Level 0 renders nothing (or a muted "Unverified" when `showZero`).
 */
export function VerificationBadge({
  level,
  showZero = false,
  className,
}: {
  level: number;
  showZero?: boolean;
  className?: string;
}) {
  if (level <= 0) {
    if (!showZero) return null;
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500", className)}>
        Unverified
      </span>
    );
  }
  return (
    <span
      title={`Verified level ${level} · ${VERIFICATION_LEVEL_NAME[level]}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-signal/10 px-2 py-0.5 text-xs font-semibold text-signal",
        className,
      )}
    >
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 1.5l7 3v5c0 4.2-2.9 7.7-7 9-4.1-1.3-7-4.8-7-9v-5l7-3zm3.7 6.1l-1.1-1.1L9 10.2 7.4 8.6l-1.1 1.1L9 12.4z" clipRule="evenodd" />
      </svg>
      L{level} verified
    </span>
  );
}

/** The 4-dot ladder showing progress across levels. */
export function VerificationLadder({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Verification level ${level} of 4`}>
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={cn("h-1.5 w-5 rounded-full", i <= level ? "bg-signal" : "bg-stone-200")}
        />
      ))}
    </span>
  );
}
