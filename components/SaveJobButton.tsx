import { saveJob, unsaveJob } from "@/app/jobs/actions";
import { cn } from "./ui";

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M6 3.5h12a1 1 0 011 1V21l-7-4-7 4V4.5a1 1 0 011-1z" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Plain server-action form, same pattern as the rest of the app — no
 * client JS. Safe to place inside a stretched-link job card: give it
 * `relative z-10` so it paints above the card's full-bleed overlay link
 * (which sits at z-0) and stays independently clickable.
 */
export function SaveJobButton({
  jobId,
  saved,
  saveLabel,
  savedLabel,
  className,
}: {
  jobId: string;
  saved: boolean;
  saveLabel: string;
  savedLabel: string;
  className?: string;
}) {
  const action = saved ? unsaveJob.bind(null, jobId) : saveJob.bind(null, jobId);
  return (
    <form action={action} className={cn("relative z-10", className)}>
      <button
        type="submit"
        aria-pressed={saved}
        aria-label={saved ? savedLabel : saveLabel}
        title={saved ? savedLabel : saveLabel}
        className={cn(
          // 44x44 minimum touch target (WCAG 2.5.5 / this project's own bar).
          "flex h-11 w-11 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2",
          saved
            ? "border-signal bg-signal/10 text-signal"
            : "border-stone-200 text-stone-400 hover:border-stone-300 hover:text-ink",
        )}
      >
        <BookmarkIcon filled={saved} />
      </button>
    </form>
  );
}
