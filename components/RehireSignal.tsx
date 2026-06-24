import { cn } from "./ui";

/**
 * The "avoid bad hires" signal aggregated from the shared reference network:
 * would-rehire rate and any no-show flags from past employers.
 */
export function RehireSignal({
  refCount,
  rehireCount,
  noShowCount,
  className,
}: {
  refCount: number;
  rehireCount: number;
  noShowCount: number;
  className?: string;
}) {
  if (!refCount) return null;
  const pct = Math.round((rehireCount / refCount) * 100);
  const tone = pct >= 80 ? "text-success" : pct >= 50 ? "text-[#9a6b00]" : "text-danger";
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-2 text-xs", className)}>
      <span className={cn("font-medium", tone)} title="From the shared reference network">
        {pct}% would re-hire ({refCount})
      </span>
      {noShowCount > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 font-medium text-danger">
          {noShowCount} no-show{noShowCount > 1 ? "s" : ""}
        </span>
      )}
    </span>
  );
}
