import Link from "next/link";
import { ViewToggle } from "./ViewToggle";
import { buttonClass } from "./ui";

type Nav = {
  findWork: string;
  findTalent: string;
  howItWorks: string;
  knowYourRights: string;
  marketing: string;
  admin: string;
  messages: string;
  dashboard: string;
  signOut: string;
  logIn: string;
  join: string;
};

/**
 * Mobile navigation. The desktop nav is `hidden md:flex`, so without this a
 * phone user can't reach any nav page, Messages, or the worker/employer toggle.
 * Built on a native <details> disclosure — no client JS, consistent with the
 * rest of the app's SSR-first approach.
 */
export function MobileMenu({
  t,
  user,
  onboarded,
  isAdmin,
  hasUnread,
  dashboardHref,
  activeView,
}: {
  t: Nav;
  user: boolean;
  onboarded: boolean;
  isAdmin: boolean;
  hasUnread: boolean;
  dashboardHref: string;
  activeView: "worker" | "employer" | null;
}) {
  const link = "block py-2 text-sm text-stone-700 hover:text-ink";
  return (
    <details className="group relative md:hidden [&_summary::-webkit-details-marker]:hidden">
      <summary
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full hover:bg-stone-100"
        aria-label="Menu"
      >
        <span className="relative">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-ink">
            <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
          </svg>
          {user && hasUnread && (
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-signal" />
          )}
        </span>
      </summary>

      <div className="absolute right-0 z-50 mt-2 w-56 rounded-[var(--radius-base)] border border-stone-200 bg-paper p-3 shadow-lg">
        <Link href="/jobs" className={link}>{t.findWork}</Link>
        <Link href="/talent" className={link}>{t.findTalent}</Link>
        <Link href="/about" className={link}>{t.howItWorks}</Link>
        <Link href="/rights" className={link}>{t.knowYourRights}</Link>
        <Link href="/marketing-solutions" className={link}>{t.marketing}</Link>
        {isAdmin && (
          <Link href="/admin/verifications" className="block py-2 text-sm font-medium text-signal">
            {t.admin}
          </Link>
        )}

        <div className="my-2 border-t border-stone-100" />

        {user ? (
          <>
            <Link href="/messages" className="flex items-center gap-2 py-2 text-sm text-stone-700 hover:text-ink">
              {t.messages}
              {hasUnread && <span className="h-2 w-2 rounded-full bg-signal" />}
            </Link>
            <Link href={dashboardHref} className={link}>{t.dashboard}</Link>
            {onboarded && (
              <div className="py-2">
                <ViewToggle activeView={activeView} />
              </div>
            )}
            <form action="/auth/signout" method="post" className="pt-1">
              <button className={buttonClass("outline", "sm")} type="submit">
                {t.signOut}
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col gap-2 pt-1">
            <Link href="/login" className={buttonClass("ghost", "sm")}>{t.logIn}</Link>
            <Link href="/signup" className={buttonClass("primary", "sm")}>{t.join}</Link>
          </div>
        )}
      </div>
    </details>
  );
}
