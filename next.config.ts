import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage public bucket (resumes, portfolio, workplace photos)
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  // The /rights pages read Markdown from content/ at request time — ensure those
  // files are bundled into the serverless functions on Vercel.
  outputFileTracingIncludes: {
    "/rights/**": ["./content/rights/**/*"],
  },
};

export default nextConfig;
