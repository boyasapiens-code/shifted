import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { Input, buttonClass } from "@/components/ui";
import { becomeEmployer } from "../actions";

export const metadata: Metadata = { title: "Add an employer profile" };

export default async function BecomeEmployerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/become-employer");

  // Already have an employer profile? Go straight to the dashboard.
  const { data: employer } = await supabase
    .from("employer_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (employer) redirect("/employer");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Logo className="mb-8 text-xl" />
        <p className="eyebrow">Add your employer side</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Start hiring on SHIFTED
        </h1>
        <p className="mt-2 mb-6 text-stone-500">
          Same account — you can switch between your Worker and Employer views
          anytime. What&apos;s your business called?
        </p>
        <form action={becomeEmployer} className="space-y-3">
          <Input name="company_name" required placeholder="Company name" />
          <button type="submit" className={buttonClass("primary", "lg", "w-full")}>
            Create employer profile
          </button>
        </form>
      </div>
    </main>
  );
}
