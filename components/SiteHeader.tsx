import Link from "next/link";
import { getAccount } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { AccountMenu } from "./AccountMenu";
import { ButtonLink, Container, buttonClass, cn } from "./ui";

/**
 * Top navigation. Deliberately short public nav (หางาน / วิธีการทำงาน /
 * สิทธิ์และความปลอดภัย) — everything else that used to compete with it
 * (Marketing/Sales/Advertising, "Admin") lives in the footer or the account
 * menu instead. The employer entry point is one clearly separated CTA
 * button, not another nav link.
 *
 * Desktop nav switches on at `lg` (1024px), not the more common `md`
 * (768px): at exactly 768px, nav links + the "Find talent" button + the
 * language toggle + Log in/Join (or the signed-in cluster) genuinely don't
 * fit — caught live at the tablet breakpoint, where "Find work"/"How it
 * works"/"Find talent" were wrapping onto two lines. MobileMenu's trigger
 * (below) uses the matching `lg:hidden` — the full-width fixed panel
 * already has plenty of room at tablet width, so extending its range one
 * breakpoint costs nothing.
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
      const { data: unread } = await account.supabase.rpc("has_unread_messages");
      hasUnread = unread === true;
    }
  } catch {
    // No backend configured / network error — render signed-out nav.
  }

  const dashboardHref =
    activeView === "employer" || (!hasWorker && hasEmployer)
      ? "/employer"
      : hasWorker
        ? "/candidate"
        : "/onboarding";

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-paper/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-stone-600 lg:flex">
            <Link href="/jobs" className="hover:text-ink">
              {t.findWork}
            </Link>
            <Link href="/about" className="hover:text-ink">
              {t.howItWorks}
            </Link>
            <Link href="/rights" className="hover:text-ink">
              {t.rightsAndSafety}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Employer entry — a distinct button, not a nav link, so it never
              reads as "one more candidate-journey item." */}
          <Link href="/talent" className={cn(buttonClass("outline", "sm"), "hidden lg:inline-flex")}>
            {t.findTalent}
          </Link>

          {user ? (
            <div className="hidden items-center gap-4 lg:flex">
              <Link href="/messages" className="relative text-sm text-stone-600 hover:text-ink">
                {t.messages}
                {hasUnread && (
                  <>
                    <span className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-signal" aria-hidden="true" />
                    <span className="sr-only"> ({t.unreadMessages})</span>
                  </>
                )}
              </Link>
              {hasWorker && (
                <Link href="/candidate/saved" className="text-sm text-stone-600 hover:text-ink">
                  {t.savedJobs}
                </Link>
              )}
              {hasEmployer && !hasWorker && (
                <Link href="/employer" className="text-sm text-stone-600 hover:text-ink">
                  {t.activity}
                </Link>
              )}
              <AccountMenu
                t={t}
                isAdmin={isAdmin}
                hasWorker={hasWorker}
                hasEmployer={hasEmployer}
                activeView={activeView}
                dashboardHref={dashboardHref}
              />
            </div>
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <LanguageSwitcher />
              <ButtonLink href="/login" variant="ghost" size="sm">
                {t.logIn}
              </ButtonLink>
              <ButtonLink href="/signup" variant="primary" size="sm">
                {t.join}
              </ButtonLink>
            </div>
          )}

          <MobileMenu
            t={t}
            user={!!user}
            hasWorker={hasWorker}
            hasEmployer={hasEmployer}
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
