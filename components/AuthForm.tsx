"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "./ui";

/**
 * Email magic-link + Google sign-in. LINE login is planned (Supabase supports
 * it via a custom OIDC provider) — wired the same way once the channel is set up.
 */
export function AuthForm({
  next,
  requireConsent = false,
}: {
  next?: string;
  requireConsent?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(!requireConsent);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  const redirectTo = () => {
    const base =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (typeof window !== "undefined" ? window.location.origin : "");
    const url = new URL("/auth/callback", base);
    if (next) url.searchParams.set("next", next);
    return url.toString();
  };

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
      setMessage(`Check ${email} for a sign-in link.`);
    }
  }

  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
  }

  if (status === "sent") {
    return (
      <div className="rounded-[var(--radius-base)] border border-stone-200 bg-stone-50 p-5 text-sm text-stone-700">
        <p className="font-medium text-ink">Link sent.</p>
        <p className="mt-1">{message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requireConsent && (
        <label className="flex items-start gap-2 text-xs text-stone-600">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--color-ink)]"
          />
          <span>
            I&apos;m 18 or older and agree to SHIFTED&apos;s{" "}
            <Link href="/legal" className="font-medium text-ink underline">
              Terms &amp; Privacy Policy
            </Link>
            , including processing of verification documents under PDPA.
          </span>
        </label>
      )}

      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={!agreed}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-base)] border border-stone-300 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <GoogleGlyph />
        Continue with Google
      </button>

      <div className="flex items-center gap-3 text-xs text-stone-400">
        <span className="h-px flex-1 bg-stone-200" />
        OR
        <span className="h-px flex-1 bg-stone-200" />
      </div>

      <form onSubmit={sendMagicLink} className="space-y-3">
        <Input
          type="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <Button
          type="submit"
          className="w-full"
          disabled={status === "sending" || !agreed}
        >
          {status === "sending" ? "Sending…" : "Email me a sign-in link"}
        </Button>
        {status === "error" && (
          <p className="text-sm text-red-600">{message}</p>
        )}
      </form>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 7.1 29.6 5 24 5 16.3 5 9.7 9.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 36 26.7 37 24 37c-5.3 0-9.7-2.6-11.3-7l-6.5 5C9.6 40.6 16.2 45 24 45z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C40.9 36.6 45 31 45 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
