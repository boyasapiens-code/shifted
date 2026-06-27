import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage public bucket (resumes, portfolio, workplace photos)
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  // Pages that read Markdown from content/ at request time — ensure those files
  // are bundled into the serverless functions on Vercel.
  outputFileTracingIncludes: {
    "/rights/**": ["./content/rights/**/*"],
    "/marketing-solutions/**": ["./content/marketing/**/*"],
  },
};

// Sentry build-time wrapping (instruments the app, optionally uploads source
// maps). Runtime error capture is gated on NEXT_PUBLIC_SENTRY_DSN; source-map
// upload is gated on SENTRY_AUTH_TOKEN, so local and CI builds without secrets
// still succeed — they just skip the upload step.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Strip Sentry's own debug logging from the client bundle (smaller payload).
  webpack: { treeshake: { removeDebugLogging: true } },
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
