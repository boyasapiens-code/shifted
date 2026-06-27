// Sentry — server runtime (Node). Loaded by instrumentation.ts only when a DSN
// is set, so this is a no-op until NEXT_PUBLIC_SENTRY_DSN is configured.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance sampling: full in dev, 10% in prod (tune as traffic grows).
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // PDPA: never attach cookies, headers, IP, or request bodies — they can carry
  // worker PII. Keep this false. Scrub anything sensitive before capture instead.
  sendDefaultPii: false,

  // Quieter logs locally; Sentry's own debug output off.
  debug: false,
});
