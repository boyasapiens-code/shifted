import Link from "next/link";
import { cn } from "./ui";

/**
 * App icon / mark — coral "s↗" tile (the rising shift). Uses brand coral
 * regardless of context.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-label="SHIFTED"
      role="img"
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-[10px] bg-signal text-paper text-sm font-extrabold leading-none",
        className,
      )}
    >
      s↗
    </span>
  );
}

/**
 * Wordmark lockup — lowercase `shifted ↗` with the rising arrow; the "ed" and
 * arrow carry the coral. `onDark` keeps the base letters white on dark surfaces.
 */
export function Logo({
  className,
  href = "/",
  showWordmark = true,
  onDark = false,
}: {
  className?: string;
  href?: string;
  showWordmark?: boolean;
  onDark?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label="SHIFTED home"
      className={cn("inline-flex items-center gap-2", onDark ? "text-paper" : "text-ink", className)}
    >
      {showWordmark ? (
        <span className="text-xl font-extrabold tracking-[-0.04em]">
          shift<span className="text-signal">ed</span>
          <span className="text-signal"> ↗</span>
        </span>
      ) : (
        <LogoMark />
      )}
    </Link>
  );
}
