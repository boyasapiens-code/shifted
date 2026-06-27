// Next.js instrumentation hook. Runs once per server/edge runtime at startup.
// Sentry init is gated on the DSN so local dev and preview stay silent until
// NEXT_PUBLIC_SENTRY_DSN is configured (see docs/launch-checklist.md).
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captures errors thrown in nested React Server Components (Next 15). No-op
// when Sentry is uninitialised, so it's safe to export unconditionally.
export const onRequestError = Sentry.captureRequestError;
