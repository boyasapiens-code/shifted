import type { SkillStatus } from "@/lib/types";
import { cn } from "./ui";

const STATUS_STYLE: Record<SkillStatus, string> = {
  self_declared: "border border-stone-200 bg-paper text-stone-500",
  platform_verified: "border border-signal/30 bg-signal/5 text-signal",
  employer_verified: "border-transparent bg-signal text-paper",
};

/** A single skill rendered by verification status. */
export function SkillChip({
  name,
  status,
  isGate,
  className,
}: {
  name: string;
  status: SkillStatus;
  isGate?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLE[status],
        className,
      )}
    >
      {status === "employer_verified" && (
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden="true">
          <path d="M6.5 11L3 7.5l1-1 2.5 2.5L12 3.5l1 1z" />
        </svg>
      )}
      {name}
      {isGate && (
        <span className="ml-0.5 rounded-sm bg-warning/20 px-1 text-[10px] font-semibold text-[#9a6b00]">
          GATE
        </span>
      )}
    </span>
  );
}

/** Compact "verified skills" summary for cards (count + top badges). */
export function VerifiedSkills({
  count,
  badges,
  className,
}: {
  count: number;
  badges: string[];
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5 text-xs", className)}>
      <span className="inline-flex items-center gap-1 font-medium text-signal">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
          <path d="M6.5 11L3 7.5l1-1 2.5 2.5L12 3.5l1 1z" />
        </svg>
        {count} verified skill{count > 1 ? "s" : ""}
      </span>
      {badges.slice(0, 2).map((b) => (
        <span key={b} className="rounded-full bg-signal/10 px-2 py-0.5 font-medium text-signal">
          {b}
        </span>
      ))}
    </span>
  );
}
