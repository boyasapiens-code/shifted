import { Disclosure } from "./Disclosure";
import type { Dict } from "@/lib/i18n";

/**
 * What verification actually means — levels, what was checked, and an
 * explicit "this is not a guarantee" disclaimer. The old VerificationBadge
 * only had a native `title` tooltip (level name only, no detail). Safe to
 * be a real interactive disclosure here — the job-detail page doesn't have
 * the "everything's wrapped in one card-link" constraint the job list does.
 */
export function VerificationExplainer({
  kind,
  level,
  t,
}: {
  kind: "worker" | "employer";
  level: number;
  t: Dict["verification"] & Pick<Dict["jobDetail"], "verificationExplainer" | "verificationWhatChecked" | "verificationNotGuarantee">;
}) {
  const levels = kind === "employer" ? t.employerLevels : t.levels;
  const title = kind === "employer" ? t.employerTitle : t.workerTitle;

  return (
    <Disclosure
      triggerLabel={t.verificationExplainer}
      triggerClassName="h-auto w-auto rounded-full px-0 text-xs font-medium text-signal underline decoration-dotted underline-offset-2 hover:text-coral-deep"
      triggerContent={t.verificationExplainer}
      align="left"
      panelClassName="w-80 max-w-[calc(100vw-2rem)]"
    >
      <div className="p-2">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <ul className="mt-3 space-y-3">
          {levels.map((lvl, i) => (
            <li key={lvl.name} className={i + 1 > level ? "opacity-40" : ""}>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-signal/10 text-[11px] font-semibold text-signal">
                  {i + 1}
                </span>
                <p className="text-sm font-medium text-ink">{lvl.name}</p>
              </div>
              <p className="ml-7 text-xs text-stone-500">{lvl.blurb}</p>
              <p className="ml-7 mt-0.5 text-xs text-stone-400">{t.verificationWhatChecked}: {lvl.checked}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-stone-100 pt-3 text-[11px] leading-relaxed text-stone-400">
          {t.verificationNotGuarantee}
        </p>
      </div>
    </Disclosure>
  );
}
