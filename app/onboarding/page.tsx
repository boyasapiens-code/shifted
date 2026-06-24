import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { Button, Input, buttonClass } from "@/components/ui";
import { chooseCandidate, chooseEmployer } from "./actions";

export const metadata: Metadata = { title: "Get started" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  // Already onboarded? Send them to their dashboard.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role === "candidate") redirect("/candidate");
  if (profile?.role === "employer") redirect("/employer");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-2xl">
        <Logo className="mb-8 text-xl" />
        <h1 className="text-3xl font-semibold tracking-tight">
          How will you use SHIFTED?
        </h1>
        <p className="mt-2 mb-8 text-stone-500">
          This sets up your account. You can&apos;t be both — pick the one that
          fits you today.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Candidate */}
          <form
            action={chooseCandidate}
            className="flex flex-col rounded-[var(--radius-base)] border border-stone-200 p-6 transition-colors hover:border-ink"
          >
            <p className="eyebrow">I&apos;m looking for work</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">
              Candidate
            </h2>
            <p className="mt-2 flex-1 text-sm text-stone-500">
              Build a vetted profile, get discovered by good companies, and
              apply in one click.
            </p>
            <Button type="submit" className="mt-5 w-full">
              Continue as candidate
            </Button>
          </form>

          {/* Employer */}
          <form
            action={chooseEmployer}
            className="flex flex-col rounded-[var(--radius-base)] border border-stone-200 p-6 transition-colors hover:border-ink"
          >
            <p className="eyebrow">I&apos;m hiring</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">
              Employer
            </h2>
            <p className="mt-2 flex-1 text-sm text-stone-500">
              Post jobs, get pre-screened applicants, and build a verified
              workplace reputation.
            </p>
            <Input
              name="company_name"
              required
              placeholder="Company name"
              className="mt-5"
            />
            <button type="submit" className={buttonClass("primary", "md", "mt-3 w-full")}>
              Continue as employer
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
