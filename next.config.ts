import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage public bucket (resumes, portfolio, workplace photos)
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
