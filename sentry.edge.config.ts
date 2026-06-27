// Sentry — edge runtime (middleware, edge routes). Loaded by instrumentation.ts
// only when a DSN is set. No-op until NEXT_PUBLIC_SENTRY_DSN is configured.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  sendDefaultPii: false,
  debug: false,
});
