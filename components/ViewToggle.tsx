import type { AccountView } from "@/lib/types";
import { cn } from "./ui";
import { switchToWorker, switchToEmployer } from "@/app/account/actions";

/**
 * Worker / Employer view switch. One account, both sides. The active side is
 * highlighted; clicking the other switches view (creating that side if needed).
 */
export function ViewToggle({ activeView }: { activeView: AccountView | null }) {
  const active = activeView ?? "worker";
  const base =
    "px-3 py-1 text-xs font-medium rounded-full transition-colors";
  const on = "bg-ink text-paper";
  const off = "text-stone-500 hover:text-ink";

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-stone-200 p-0.5">
      <form action={switchToWorker}>
        <button className={cn(base, active === "worker" ? on : off)}>Worker</button>
      </form>
      <form action={switchToEmployer}>
        <button className={cn(base, active === "employer" ? on : off)}>
          Employer
        </button>
      </form>
    </div>
  );
}
