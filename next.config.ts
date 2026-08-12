import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage public bucket (resumes, portfolio, workplace photos)
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  // Canonical host is www — the apex is a redirect shell only. This used to
  // live ONLY in Vercel's dashboard domain config, invisible to this repo;
  // Stripe's webhook silently failed once because it was registered at the
  // apex, which redirects, and Stripe doesn't follow redirects on webhook
  // delivery (see docs/launch-checklist.md §5). Making it code closes that
  // gap for good and makes it portable across hosting providers.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "shiftedth.com" }],
        destination: "https://www.shiftedth.com/:path*",
        permanent: true,
      },
    ];
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
