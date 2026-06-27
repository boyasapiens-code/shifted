// Sentry — browser runtime. Loaded on every client. Gated on the DSN so it does
// nothing until NEXT_PUBLIC_SENTRY_DSN is set. No Session Replay (it records the
// DOM, which can expose worker PII — PDPA).
import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    sendDefaultPii: false,
    debug: false,
  });
}

// Instruments client-side navigations (Next 15 App Router). Safe no-op when
// Sentry is uninitialised.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
