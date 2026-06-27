import { getLocale } from "@/lib/i18n";
import { setLocale } from "@/lib/i18n/actions";
import { cn } from "./ui";

/** EN | ไทย toggle — sets the locale cookie and re-renders. No client JS. */
export async function LanguageSwitcher({ className }: { className?: string }) {
  const locale = await getLocale();
  const opt = (code: "en" | "th", label: string) => (
    <form action={setLocale.bind(null, code)}>
      <button
        type="submit"
        className={cn(
          "rounded-full px-2.5 py-1 text-xs font-semibold transition",
          locale === code ? "bg-ink text-paper" : "text-stone-500 hover:text-ink",
        )}
      >
        {label}
      </button>
    </form>
  );
  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-full border border-stone-200 p-0.5", className)}>
      {opt("en", "EN")}
      {opt("th", "ไทย")}
    </div>
  );
}
