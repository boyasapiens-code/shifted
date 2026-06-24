import Link from "next/link";
import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="grid-texture pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="relative w-full max-w-sm">
        <Logo className="mb-8 text-xl" />
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 mb-6 text-sm text-stone-500">
          Log in to continue to your SHIFTED account.
        </p>
        {error && (
          <p className="mb-4 rounded-[var(--radius-base)] bg-red-50 px-3 py-2 text-sm text-red-700">
            Something went wrong signing you in. Please try again.
          </p>
        )}
        <AuthForm next={next} />
        <p className="mt-6 text-sm text-stone-500">
          New to SHIFTED?{" "}
          <Link href="/signup" className="font-medium text-ink underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
