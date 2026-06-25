import Link from "next/link";
import type { ReactNode } from "react";

// Daybreak preview primitives — built to the handoff spec (§5). Self-contained:
// they use the .daybreak-scoped CSS vars (--db-*) so nothing here affects the
// live brand. Arbitrary Tailwind values reference those vars directly.

const focus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--db-coral)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--db-cream)]";

type BtnVariant = "primary" | "secondary" | "ghost" | "amber";

const BTN: Record<BtnVariant, string> = {
  primary: "bg-[var(--db-coral)] text-white hover:bg-[var(--db-coral-deep)]",
  secondary: "bg-[var(--db-ink)] text-white hover:opacity-90",
  ghost: "bg-transparent text-[var(--db-ink)] border-[1.5px] border-[var(--db-ink)] hover:bg-[var(--db-ink)] hover:text-white",
  amber: "bg-[var(--db-amber)] text-[var(--db-ink)] hover:brightness-95",
};

export function DbButton({
  variant = "primary",
  href,
  className = "",
  children,
}: {
  variant?: BtnVariant;
  href?: string;
  className?: string;
  children: ReactNode;
}) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-[30px] px-6 py-3 font-bold transition ${BTN[variant]} ${focus} ${className}`;
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <button className={cls} type="button">
      {children}
    </button>
  );
}

export function DbTag({ children, soft = false }: { children: ReactNode; soft?: boolean }) {
  return (
    <span
      className={`inline-block rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-[var(--db-tagtext)] ${
        soft ? "bg-[var(--db-peach-soft)]" : "bg-[var(--db-peach)]"
      }`}
    >
      {children}
    </span>
  );
}

export function DbBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--db-green-soft)] px-2.5 py-1 text-xs font-bold text-[var(--db-green)]">
      <span aria-hidden>✓</span>
      {children}
    </span>
  );
}

export function DbInput({
  placeholder,
  label,
  type = "text",
  className = "",
}: {
  placeholder?: string;
  label?: string;
  type?: string;
  className?: string;
}) {
  return (
    <label className="block">
      {label && <span className="sr-only">{label}</span>}
      <input
        type={type}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        className={`w-full rounded-[12px] border-[1.5px] border-[var(--db-line)] bg-white px-4 py-3.5 text-[15px] text-[var(--db-ink)] placeholder:text-[var(--db-muted)] focus:border-[var(--db-coral)] focus:outline-none focus:ring-2 focus:ring-[var(--db-coral)]/20 ${className}`}
      />
    </label>
  );
}

export function DbJobCard({
  initial,
  title,
  company,
  area,
  posted,
  tags,
  boosted = false,
  verified = false,
}: {
  initial: string;
  title: string;
  company: string;
  area: string;
  posted: string;
  tags: string[];
  boosted?: boolean;
  verified?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-4 rounded-[16px] bg-white p-5 shadow-[0_8px_30px_rgba(43,27,46,0.07)] ${
        boosted ? "border-[1.5px] border-[var(--db-amber)]" : "border border-[var(--db-line)]"
      }`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[var(--db-peach)] text-lg font-extrabold text-[var(--db-tagtext)]">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold text-[var(--db-ink)]">{title}</h3>
          {boosted && (
            <span className="rounded-full bg-[var(--db-amber)] px-2 py-0.5 text-[11px] font-bold text-[var(--db-ink)]">
              ⚡ Boosted
            </span>
          )}
          {verified && <DbBadge>Verified</DbBadge>}
        </div>
        <p className="mt-0.5 text-[13px] text-[var(--db-muted)]">
          {company} · {area} · {posted}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((t) => (
            <DbTag key={t} soft>
              {t}
            </DbTag>
          ))}
        </div>
      </div>
      <div className="hidden sm:block">
        <DbButton variant="primary" className="px-5 py-2.5 text-sm">
          Apply
        </DbButton>
      </div>
    </div>
  );
}

/** The rising-shift wordmark: `shifted↗` with "ed" in coral. */
export function DbWordmark({ onDark = false }: { onDark?: boolean }) {
  return (
    <span
      className={`text-2xl font-extrabold tracking-[-1px] ${onDark ? "text-white" : "text-[var(--db-ink)]"}`}
    >
      shift<span className="text-[var(--db-coral)]">ed</span>
      <span className="text-[var(--db-coral)]"> ↗</span>
    </span>
  );
}
