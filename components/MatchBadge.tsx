import { cn } from "./ui";
import { BAND_LABEL, type MatchBand } from "@/lib/matching/taxonomy";
import type { MatchResult } from "@/lib/matching/types";

const BAND_STYLE: Record<MatchBand, string> = {
  strong: "bg-success/10 text-success",
  good: "bg-signal/10 text-signal",
  maybe: "bg-stone-100 text-stone-500",
  hide: "bg-stone-100 text-stone-400",
};

/**
 * Symmetric match score — the same number a worker and an employer see for the
 * same pair. Shows the band + score, with a per-dimension breakdown on click.
 * Low-confidence matches are flagged honestly rather than hidden.
 */
export function MatchBadge({ result, showBreakdown = true }: { result: MatchResult; showBreakdown?: boolean }) {
  if (result.gated) return null; // gated pairs are hidden, not shown as a low score
  const lowConfidence = result.confidence < 0.5;

  const pill = (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", BAND_STYLE[result.band])}>
      {BAND_LABEL[result.band]}
      <span className="opacity-70">· {result.score}</span>
    </span>
  );

  if (!showBreakdown) return pill;

  return (
    <details className="group relative inline-block">
      <summary className="cursor-pointer list-none marker:hidden">{pill}</summary>
      <div className="absolute right-0 z-10 mt-2 w-64 rounded-[var(--radius-card)] border border-stone-200 bg-paper p-3 text-left shadow-lg">
        <p className="text-xs font-medium text-ink">Why this score</p>
        <ul className="mt-2 space-y-1.5">
          {result.dimensions.map((d) => (
            <li key={d.key} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-stone-500">{d.label}</span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-stone-100">
                  <span
                    className="block h-full rounded-full bg-ink"
                    style={{ width: `${Math.round((d.score ?? 0) * 100)}%` }}
                  />
                </span>
                <span className="w-7 text-right text-stone-400">
                  {d.score == null ? "—" : Math.round(d.score * 100)}
                </span>
              </span>
            </li>
          ))}
        </ul>
        {lowConfidence && (
          <p className="mt-2 text-[11px] text-stone-400">
            Lower confidence — add pay, availability and location to sharpen this.
          </p>
        )}
      </div>
    </details>
  );
}
