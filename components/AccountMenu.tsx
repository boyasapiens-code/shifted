import Link from "next/link";
import { Disclosure } from "./Disclosure";
import { ViewToggle } from "./ViewToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import type { AccountView } from "@/lib/types";
import type { Dict } from "@/lib/i18n";

/**
 * Compact logged-in account menu: Dashboard, role switch (only when it's a
 * real switch between two existing sides), Admin (only for admins — never
 * in the primary nav), Language, Sign out. Everything here used to be
 * scattered across the primary nav / always-visible controls; this is the
 * one place it lives now.
 */
export function AccountMenu({
  t,
  isAdmin,
  hasWorker,
  hasEmployer,
  activeView,
  dashboardHref,
}: {
  t: Dict["nav"];
  isAdmin: boolean;
  hasWorker: boolean;
  hasEmployer: boolean;
  activeView: AccountView | null;
  dashboardHref: string;
}) {
  const dualRole = hasWorker && hasEmployer;

  return (
    <Disclosure
      triggerLabel={t.accountMenu}
      triggerClassName="border border-stone-200 text-stone-600 hover:border-stone-300 hover:text-ink"
      align="right"
      triggerContent={
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
        </svg>
      }
    >
      <div className="flex flex-col gap-1">
        {dualRole && (
          <div className="px-1 py-1">
            <ViewToggle activeView={activeView} />
          </div>
        )}
        {!dualRole && hasWorker && !hasEmployer && (
          <Link
            href="/account/become-employer"
            className="rounded-[var(--radius-base)] px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-ink"
          >
            {t.becomeEmployer}
          </Link>
        )}
        {!dualRole && hasEmployer && !hasWorker && (
          <Link
            href="/onboarding"
            className="rounded-[var(--radius-base)] px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-ink"
          >
            {t.becomeWorker}
          </Link>
        )}

        <Link
          href={dashboardHref}
          className="rounded-[var(--radius-base)] px-3 py-2 text-sm font-medium text-ink hover:bg-stone-50"
        >
          {t.dashboard}
        </Link>

        {isAdmin && (
          <Link
            href="/admin/verifications"
            className="rounded-[var(--radius-base)] px-3 py-2 text-sm font-medium text-signal hover:bg-signal/10"
          >
            {t.admin}
          </Link>
        )}

        <div className="my-1 border-t border-stone-100" />

        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs text-stone-400">{t.language}</span>
          <LanguageSwitcher />
        </div>

        <div className="my-1 border-t border-stone-100" />

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="w-full rounded-[var(--radius-base)] px-3 py-2 text-left text-sm text-stone-600 hover:bg-stone-50 hover:text-ink"
          >
            {t.signOut}
          </button>
        </form>
      </div>
    </Disclosure>
  );
}
