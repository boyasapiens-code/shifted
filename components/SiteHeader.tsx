import Link from "next/link";
import { getAccount } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { Logo } from "./Logo";
import { ViewToggle } from "./ViewToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { ButtonLink, Container, buttonClass } from "./ui";

/**
 * Top navigation. Reads the account and adapts: signed-out, or signed-in with a
 * Worker/Employer view toggle (one account, both sides).
 */
export async function SiteHeader() {
  const t = (await getDict()).nav;
  let user: { id: string } | null = null;
  let hasWorker = false;
  let hasEmployer = false;
  let isAdmin = false;
  let hasUnread = false;
  let activeView: "worker" | "employer" | null = null;
  try {
    const account = await getAccount();
    user = account.user;
    hasWorker = account.hasWorker;
    hasEmployer = account.hasEmployer;
    isAdmin = account.profile?.is_admin ?? false;
    activeView = account.activeView;

    if (user) {
      // One indexed boolean instead of scanning every conversation per render.
      const { data: unread } = await account.supabase.rpc("has_unread_messages");
      hasUnread = unread === true;
    }
  } catch {
    // No backend configured / network error — render signed-out nav.
  }

  const onboarded = hasWorker || hasEmployer;
  const dashboardHref =
    activeView === "employer" || (!hasWorker && hasEmployer)
      ? "/employer"
      : hasWorker
        ? "/candidate"
        : "/onboarding";

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-paper/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-stone-600 md:flex">
            <Link href="/jobs" className="hover:text-ink">
              {t.findWork}
            </Link>
            <Link href="/talent" className="hover:text-ink">
              {t.findTalent}
            </Link>
            <Link href="/about" className="hover:text-ink">
              {t.howItWorks}
            </Link>
            <Link href="/rights" className="hover:text-ink">
              {t.knowYourRights}
            </Link>
            <Link href="/marketing-solutions" className="hover:text-ink">
              {t.marketing}
            </Link>
            {isAdmin && (
              <Link href="/admin/verifications" className="font-medium text-signal hover:underline">
                {t.admin}
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Always visible — language toggle matters most on mobile (Thai-market, phone-first). */}
          <LanguageSwitcher />

          {/* Desktop auth cluster */}
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <>
                {onboarded && <ViewToggle activeView={activeView} />}
                <Link
                  href="/messages"
                  className="relative text-sm text-stone-600 hover:text-ink"
                >
                  {t.messages}
                  {hasUnread && (
                    <span className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-signal" />
                  )}
                </Link>
                <ButtonLink href={dashboardHref} variant="ghost" size="sm">
                  {t.dashboard}
                </ButtonLink>
                <form action="/auth/signout" method="post">
                  <button className={buttonClass("outline", "sm")} type="submit">
                    {t.signOut}
                  </button>
                </form>
              </>
            ) : (
              <>
                <ButtonLink href="/login" variant="ghost" size="sm">
                  {t.logIn}
                </ButtonLink>
                <ButtonLink href="/signup" variant="primary" size="sm">
                  {t.join}
                </ButtonLink>
              </>
            )}
          </div>

          {/* Mobile menu — the only nav on phones (desktop nav is md-only) */}
          <MobileMenu
            t={t}
            user={!!user}
            onboarded={onboarded}
            isAdmin={isAdmin}
            hasUnread={hasUnread}
            dashboardHref={dashboardHref}
            activeView={activeView}
          />
        </div>
      </Container>
    </header>
  );
}
