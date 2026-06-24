import { cn } from "./ui";

/** Five-star row; fills round(value) stars. Editorial ink, not gold. */
export function RatingStars({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const filled = Math.round(value);
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-ink", className)} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 20 20" className="h-3.5 w-3.5" fill={i <= filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
          <path d="M10 1.6l2.47 5.18 5.7.74-4.2 3.9 1.07 5.64L10 14.9l-5.04 2.16 1.07-5.64-4.2-3.9 5.7-.74z" />
        </svg>
      ))}
    </span>
  );
}

/** Stars + "4.8 (12)" — or a muted "No reviews yet" when empty. */
export function RatingSummary({
  avg,
  count,
  className,
}: {
  avg: number | null;
  count: number;
  className?: string;
}) {
  if (!count || avg == null) {
    return <span className={cn("text-sm text-stone-400", className)}>No reviews yet</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <RatingStars value={avg} />
      <span className="font-medium text-ink">{avg.toFixed(1)}</span>
      <span className="text-stone-500">({count})</span>
    </span>
  );
}

/** Worker reliability pill — reputation-state aware. Building/Suspended show a
 *  state label; otherwise the score (At risk = amber, Active = green). */
export function ReliabilityBadge({
  score,
  state,
  className,
}: {
  score: number | null;
  state?: string;
  className?: string;
}) {
  const base = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium";
  const shield = (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 1.5l7 3v5c0 4.2-2.9 7.7-7 9-4.1-1.3-7-4.8-7-9v-5l7-3zm3.7 6.1l-1.1-1.1L9 10.2 7.4 8.6l-1.1 1.1L9 12.4z" clipRule="evenodd" />
    </svg>
  );

  if (state === "building") {
    return (
      <span className={cn(base, "bg-stone-100 text-stone-500", className)}>
        Building reputation
      </span>
    );
  }
  if (state === "suspended") {
    return (
      <span className={cn(base, "bg-danger/10 text-danger", className)}>
        {shield} Suspended
      </span>
    );
  }
  if (score == null) return null;
  const atRisk = state === "at_risk" || score < 60;
  const tone = atRisk
    ? "bg-warning/10 text-[#9a6b00]"
    : score >= 90
      ? "bg-success/10 text-success"
      : "bg-success/10 text-success";
  return (
    <span className={cn(base, tone, className)}>
      {shield}
      {atRisk ? `At risk · ${score}%` : `${score}% reliable`}
    </span>
  );
}
