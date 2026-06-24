import Link from "next/link";
import { cn } from "./ui";

/**
 * SHIFTED brand mark — a bold geometric "S" monogram with angular, dynamic
 * strokes that nod to a "shift" in motion. Uses currentColor so it inverts
 * cleanly on dark backgrounds.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-7 w-7", className)}
      role="img"
      aria-label="SHIFTED"
    >
      <path
        d="M50 13 L21 13 L21 30 L43 34 L43 51 L14 51"
        fill="none"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinejoin="miter"
        strokeLinecap="butt"
        transform="skewX(-7) translate(4 0)"
      />
    </svg>
  );
}

/**
 * Full lockup: mark + SHIFTED wordmark.
 */
export function Logo({
  className,
  href = "/",
  showWordmark = true,
}: {
  className?: string;
  href?: string;
  showWordmark?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label="SHIFTED home"
      className={cn("inline-flex items-center gap-2 text-ink", className)}
    >
      <LogoMark className="h-7 w-7" />
      {showWordmark && (
        <span className="text-lg font-black tracking-[0.06em]">SHIFTED</span>
      )}
    </Link>
  );
}
