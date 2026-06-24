// Canonical site URL. Set NEXT_PUBLIC_SITE_URL per environment
// (http://localhost:3000 for dev). Falls back to the production domain so
// metadata / OG / canonical URLs are correct even if the env var is unset.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://shiftedth.com";

export const SITE_NAME = "SHIFTED";
export const SITE_DOMAIN = "shiftedth.com";
