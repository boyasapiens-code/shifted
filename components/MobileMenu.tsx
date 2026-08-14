import Link from "next/link";
import { Disclosure } from "./Disclosure";
import { ViewToggle } from "./ViewToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { buttonClass } from "./ui";
import type { AccountView } from "@/lib/types";
import type { Dict } from "@/lib/i18n";

/**
 * Mobile nav — the only nav visible below `md`. Real <button> trigger (via
 * Disclosure) with a live aria-expanded, Escape/click-outside close, and
 * focus returned on close — the old version used <details>/<summary>
 * (aria-expanded implied only by the browser, no focus management at all).
 * One panel holds everything: on this little screen there's no room for a
 * separate hamburger + separate account icon, so primary nav, the employer
 * entry, and the account-menu content (dashboard/role-switch/admin/
 * language/sign-out) are all one scrollable list.
 */
export function MobileMenu({
  t,
  user,
  hasWorker,
  hasEmployer,
  isAdmin,
  hasUnread,
  dashboardHref,
  activeView,
}: {
  t: Dict["nav"];
  user: boolean;
  hasWorker: boolean;
  hasEmployer: boolean;
  isAdmin: boolean;
  hasUnread: boolean;
  dashboardHref: string;
  activeView: AccountView | null;
}) {
  const dualRole = hasWorker && hasEmployer;
  const linkClass =
    "block rounded-[var(--radius-base)] px-3 py-2.5 text-[15px] font-medium text-ink hover:bg-stone-50";

  return (
    <Disclosure
      triggerLabel={t.openMenu}
      // lg: not md: — matches SiteHeader's desktop-nav breakpoint (see its
      // docstring): the tablet width (768–1023px) doesn't fit the full
      // desktop nav without wrapping, so this menu covers that range too.
      triggerClassName="text-ink lg:hidden"
      panelClassName="lg:hidden"
      panelPosition="fixed"
      align="right"
      triggerContent={
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" />
        </svg>
      }
    >
      <nav className="flex flex-col gap-0.5 py-1" aria-label={t.openMenu}>
        <Link href="/jobs" className={linkClass}>
          {t.findWork}
        </Link>
        <Link href="/about" className={linkClass}>
          {t.howItWorks}
        </Link>
        <Link href="/rights" className={linkClass}>
          {t.rightsAndSafety}
        </Link>
        <Link href="/talent" className={linkClass}>
          {t.findTalent}
        </Link>

        <div className="my-1.5 border-t border-stone-100" />

        {user ? (
          <>
            <Link href="/messages" className={linkClass}>
              <span className="relative inline-flex items-center gap-1.5">
                {t.messages}
                {hasUnread && (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-signal" aria-hidden="true" />
                    <span className="sr-only"> ({t.unreadMessages})</span>
                  </>
                )}
              </span>
            </Link>
            {hasWorker && (
              <Link href="/candidate/saved" className={linkClass}>
                {t.savedJobs}
              </Link>
            )}
            {hasEmployer && !hasWorker && (
              <Link href="/employer" className={linkClass}>
                {t.activity}
              </Link>
            )}

            <div className="my-1.5 border-t border-stone-100" />

            {dualRole && (
              <div className="px-3 py-1.5">
                <ViewToggle activeView={activeView} />
              </div>
            )}
            <Link href={dashboardHref} className={linkClass}>
              {t.dashboard}
            </Link>
            {isAdmin && (
              <Link href="/admin/verifications" className={`${linkClass} text-signal`}>
                {t.admin}
              </Link>
            )}

            <div className="my-1.5 border-t border-stone-100" />
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="text-xs text-stone-400">{t.language}</span>
              <LanguageSwitcher />
            </div>
            <form action="/auth/signout" method="post" className="mt-1">
              <button type="submit" className={`${linkClass} w-full text-left text-stone-600`}>
                {t.signOut}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="text-xs text-stone-400">{t.language}</span>
              <LanguageSwitcher />
            </div>
            <div className="mt-2 flex flex-col gap-2 px-1">
              <Link href="/login" className={buttonClass("outline", "md", "w-full")}>
                {t.logIn}
              </Link>
              <Link href="/signup" className={buttonClass("primary", "md", "w-full")}>
                {t.join}
              </Link>
            </div>
          </>
        )}
      </nav>
    </Disclosure>
  );
}
