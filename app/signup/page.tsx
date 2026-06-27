import Link from "next/link";
import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";
import { getDict } from "@/lib/i18n";

export const metadata: Metadata = { title: "Join" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const t = (await getDict()).auth;
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="grid-texture pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="relative w-full max-w-sm">
        <Logo className="mb-8 text-xl" />
        <h1 className="text-2xl font-semibold tracking-tight">{t.joinTitle}</h1>
        <p className="mt-1 mb-6 text-sm text-stone-500">{t.joinSub}</p>
        <AuthForm next={next} requireConsent />
        <p className="mt-6 text-sm text-stone-500">
          {t.alreadyAccount}{" "}
          <Link href="/login" className="font-medium text-ink underline">
            {t.logIn}
          </Link>
        </p>
      </div>
    </main>
  );
}
