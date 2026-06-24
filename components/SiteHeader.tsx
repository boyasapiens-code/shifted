import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "./Logo";
import { ButtonLink, Container, buttonClass } from "./ui";

/**
 * Top navigation. Server component — reads the session and the user's role so
 * the nav adapts to candidate vs. employer vs. signed-out.
 */
export async function SiteHeader() {
  let user: { id: string } | null = null;
  let role: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    user = u;
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      role = data?.role ?? null;
    }
  } catch {
    // No backend configured / network error — render signed-out nav.
  }

  const dashboardHref =
    role === "employer" ? "/employer" : role === "candidate" ? "/candidate" : "/onboarding";

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
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
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
