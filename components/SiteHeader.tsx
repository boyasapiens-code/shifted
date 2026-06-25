import Link from "next/link";
import { getAccount } from "@/lib/auth";
import { Logo } from "./Logo";
import { ViewToggle } from "./ViewToggle";
import { ButtonLink, Container, buttonClass } from "./ui";

/**
 * Top navigation. Reads the account and adapts: signed-out, or signed-in with a
 * Worker/Employer view toggle (one account, both sides).
 */
export async function SiteHeader() {
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
      const { data: convos } = await account.supabase
        .from("conversations")
        .select("employer_id, worker_id, last_message_at, employer_last_read_at, worker_last_read_at");
      hasUnread = (convos ?? []).some((c) => {
        const lastRead =
          c.employer_id === user!.id ? c.employer_last_read_at : c.worker_last_read_at;
        return !lastRead || c.last_message_at > lastRead;
      });
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
              Find work
            </Link>
            <Link href="/talent" className="hover:text-ink">
              Find talent
            </Link>
            <Link href="/about" className="hover:text-ink">
              How it works
            </Link>
            <Link href="/rights" className="hover:text-ink">
              Know Your Rights
            </Link>
            <Link href="/marketing-solutions" className="hover:text-ink">
              Marketing
            </Link>
            {isAdmin && (
              <Link href="/admin/verifications" className="font-medium text-signal hover:underline">
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {onboarded && (
                <div className="hidden sm:block">
                  <ViewToggle activeView={activeView} />
                </div>
              )}
              <Link
                href="/messages"
                className="relative hidden text-sm text-stone-600 hover:text-ink sm:inline"
              >
                Messages
                {hasUnread && (
                  <span className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-signal" />
                )}
              </Link>
              <ButtonLink href={dashboardHref} variant="ghost" size="sm">
                Dashboard
              </ButtonLink>
              <form action="/auth/signout" method="post">
                <button className={buttonClass("outline", "sm")} type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">
                Log in
              </ButtonLink>
              <ButtonLink href="/signup" variant="primary" size="sm">
                Join SHIFTED
              </ButtonLink>
            </>
          )}
        </div>
      </Container>
    </header>
  );
}
