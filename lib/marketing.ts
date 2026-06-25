// Marketing Solutions — lead types (shared with the admin queue) + the Partner
// data model for the internal Solutions layer. Booyah is the first partner and
// appears ONLY as an outbound link (Hub spec rule #1 — no service pages here).

export type InterestTier = "idol" | "boss" | "legend" | "diy" | "unsure";
export type LeadStatus = "new" | "contacted" | "won" | "lost";

export interface MarketingLead {
  id: string;
  employer_id: string | null;
  business_name: string;
  location: string | null;
  category: string | null;
  contact_name: string | null;
  contact_channel: string | null;
  interest_tier: InterestTier | null;
  message: string | null;
  source: string;
  status: LeadStatus;
  created_at: string;
}

// ── Partners (internal Solutions layer) ──────────────────────────────────────
export interface Partner {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  outboundUrl: string;
  ctaLabel: string;
  trustLine: string;
  order: number;
}

export const PARTNERS: Partner[] = [
  {
    slug: "booyah",
    name: "Booyah",
    tagline: "Local visibility & Google reviews",
    description:
      "Get found on Google Maps and turn searches into walk-ins. Run by the operators behind SHIFTED.",
    outboundUrl: "https://getbooyah.com",
    ctaLabel: "Visit Booyah →",
    trustLine: "Run by the operators behind SHIFTED.",
    order: 1,
  },
];

/** Outbound partner URL with SHIFTED attribution UTMs. */
export function partnerUrl(p: Partner): string {
  const url = new URL(p.outboundUrl);
  url.searchParams.set("utm_source", "shifted");
  url.searchParams.set("utm_medium", "marketing_solutions");
  url.searchParams.set("utm_campaign", `partner_${p.slug}`);
  return url.toString();
}

// In-house solution (not a partner) — Shifted's own hiring offer.
export const SHIFTED_SOLUTION = {
  title: "Hiring & employer branding",
  description:
    "Post roles, get verified, and build a profile people actually want to work for — on SHIFTED.",
  ctaLabel: "Post a job →",
  href: "/employer/jobs/new",
};
