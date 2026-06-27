import Link from "next/link";
import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";
import { getDict } from "@/lib/i18n";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const t = (await getDict()).auth;
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="grid-texture pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="relative w-full max-w-sm">
        <Logo className="mb-8 text-xl" />
        <h1 className="text-2xl font-semibold tracking-tight">{t.welcomeBack}</h1>
        <p className="mt-1 mb-6 text-sm text-stone-500">{t.loginSub}</p>
        {error && (
          <p className="mb-4 rounded-[var(--radius-base)] bg-red-50 px-3 py-2 text-sm text-red-700">
            {t.loginError}
          </p>
        )}
        <AuthForm next={next} />
        <p className="mt-6 text-sm text-stone-500">
          {t.newToShifted}{" "}
          <Link href="/signup" className="font-medium text-ink underline">
            {t.createAccount}
          </Link>
        </p>
      </div>
    </main>
  );
}
