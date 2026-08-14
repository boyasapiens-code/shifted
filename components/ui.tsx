import * as React from "react";
import Link from "next/link";

/** Tiny className combiner. */
export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Container
// ---------------------------------------------------------------------------
export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
export function Card({
  className,
  interactive,
  children,
}: {
  className?: string;
  interactive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-stone-200 bg-paper",
        interactive && "card-interactive",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
type ButtonVariant = "primary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2";

const buttonVariants: Record<ButtonVariant, string> = {
  // Dark-plum text on coral, not white: white-on-#ff6b4a measures ~2.8:1,
  // below WCAG AA's 4.5:1 for this button's ~14-16px text. Ink-on-coral
  // measures ~5.7:1 — keeps the existing brand coral untouched (no new
  // shade to introduce) while actually meeting contrast.
  primary: "bg-signal text-ink shadow-[var(--shadow-sm)] hover:brightness-95",
  outline: "border-[1.5px] border-ink text-ink hover:bg-ink hover:text-paper",
  ghost: "text-ink hover:bg-stone-100",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  href,
  children,
  ...props
}: React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------
const fieldBase =
  "w-full rounded-[var(--radius-base)] border-[1.5px] border-stone-200 bg-paper px-3.5 text-ink placeholder:text-stone-400 focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/25";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldBase, "h-11", props.className)} />;
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea {...props} className={cn(fieldBase, "min-h-28 py-2.5", props.className)} />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(fieldBase, "h-11 pr-8", props.className)} />
  );
}

export function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-ink", className)}
      {...props}
    >
      {children}
    </label>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------
type BadgeTone = "default" | "blue" | "green" | "amber" | "red" | "ink";

const badgeTones: Record<BadgeTone, string> = {
  default: "border-stone-200 bg-stone-50 text-stone-600",
  blue: "border-transparent bg-signal/10 text-signal",
  green: "border-transparent bg-success/10 text-success",
  amber: "border-transparent bg-warning/10 text-[#9a6b00]",
  red: "border-transparent bg-danger/10 text-danger",
  ink: "border-transparent bg-ink text-paper",
};

export function Badge({
  className,
  tone = "default",
  children,
}: {
  className?: string;
  tone?: BadgeTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
