import Link from "next/link";
import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "Join" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="grid-texture pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="relative w-full max-w-sm">
        <Logo className="mb-8 text-xl" />
        <h1 className="text-2xl font-semibold tracking-tight">Join SHIFTED</h1>
        <p className="mt-1 mb-6 text-sm text-stone-500">
          Create your account. You&apos;ll choose candidate or employer next.
        </p>
        <AuthForm next={next} requireConsent />
        <p className="mt-6 text-sm text-stone-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-ink underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
