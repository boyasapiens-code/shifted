// Booyah — single source of truth for Marketing Solutions pricing, proof, copy,
// and outbound links. Every price/feature on /marketing-solutions renders from
// here (grep should find NO hardcoded prices in components). THB, Booyah public
// pricing. Update in one place.

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

export interface BooyahPackage {
  id: string;
  name: string;
  price: number | null; // null = custom quote
  unit: "mo" | "once" | null;
  tagline: string;
  popular?: boolean;
  features: string[];
  cta?: string;
}

// Done-for-you: monthly, limited seats, cancel anytime, 1 client/category/zone.
export const BOOYAH_DFY: BooyahPackage[] = [
  {
    id: "idol",
    name: "Idol",
    price: 39900,
    unit: "mo",
    tagline: "Win your area",
    popular: true,
    features: [
      "Managed Google Maps",
      "AI visibility (ChatGPT + Google AI)",
      "Google Search SEO (standard)",
      "Review system (5-star, weekly)",
      "8 posts + new photos / month",
      "Live mobile dashboard",
      "Competitor exclusivity (your zone)",
      "Support via live dashboard",
    ],
  },
  {
    id: "boss",
    name: "Boss",
    price: 89900,
    unit: "mo",
    tagline: "Own your whole district",
    features: [
      "Everything in Idol, plus:",
      "Advanced SEO (own the area)",
      "Featured on Greenstead & Booyah sites (real backlinks)",
      "Full website management",
      "Exclusivity (whole district)",
      "Direct line, 7 days",
    ],
  },
  {
    id: "legend",
    name: "Legend",
    price: null,
    unit: null,
    tagline: "Multi-branch, franchise, hotel groups",
    cta: "Book a call",
    features: [
      "Everything in Boss across all branches",
      "One visibility system for all branches",
      "Per-branch dashboards + group overview",
      "Dedicated account manager + priority support",
      "Exclusivity across all markets",
    ],
  },
];

export const BOOYAH_DIY: BooyahPackage[] = [
  {
    id: "blueprint",
    name: "Blueprint",
    price: 1490,
    unit: "once",
    tagline: "Do it yourself",
    features: [
      "8-part Google Maps playbook",
      "100-point scorecard",
      "Free updates",
      "30-day money-back guarantee",
      "~30 min / week",
    ],
  },
  {
    id: "insider",
    name: "Insider",
    price: 990,
    unit: "mo",
    tagline: "Blueprint + ongoing support",
    features: [
      "Full Blueprint included",
      "Monthly updates",
      "Private Telegram",
      "Live monthly Q&A",
      "Or ฿9,900/yr (2 months free)",
    ],
  },
];

export const BOOYAH_PROJECTS: BooyahPackage[] = [
  {
    id: "tune_up",
    name: "Tune-Up",
    price: 39000,
    unit: "once",
    tagline: "3 weeks",
    features: [
      "Full Google profile fix",
      "Business data consistent across the internet",
      "Review system installed",
      "Urgent SEO fixes",
      "Blueprint buyers save ฿1,490",
    ],
  },
  {
    id: "website",
    name: "New Website",
    price: 69000,
    unit: "once",
    tagline: "2–4 weeks · from ฿69,000",
    features: [
      "TH + EN site",
      "Sub-second load",
      "Built for Google + AI",
      "Yours forever, no hidden monthly hosting",
    ],
  },
  {
    id: "custom",
    name: "Custom",
    price: null,
    unit: null,
    tagline: "Quote by scope",
    cta: "Get a quote",
    features: ["Review systems", "Dashboards", "Content", "Or a mix"],
  },
];

// Term discounts on done-for-you plans.
export const BOOYAH_TERMS = [
  { months: 1, label: "Monthly", discount: 0 },
  { months: 3, label: "3 months", discount: 0.05 },
  { months: 6, label: "6 months", discount: 0.1 },
  { months: 12, label: "12 months", discount: 0.15 },
] as const;

export const BOOYAH_STATS = [
  { value: "4,000+", label: "Google reviews on our own stores" },
  { value: "7M+", label: "Maps views from a single listing" },
  { value: "41.7K", label: "monthly search impressions in 3 months" },
  { value: "฿0", label: "ad spend to get there" },
];

export const BOOYAH_STATS_FOOTNOTE =
  "Top of the Google Maps pack since 2022; our own site scores 96 on PageSpeed. Receipts, not promises.";

export const BOOYAH_LEVERS = [
  { title: "Google Maps", desc: "Managed listing that ranks in the local pack — where buyers decide." },
  { title: "Google Search SEO", desc: "Organic search visibility for what your customers actually type." },
  { title: "AI Overviews (AIO)", desc: "Show up in Google's AI answers, not just the blue links." },
  { title: "AI assistants (GEO)", desc: "Be the place ChatGPT and AI assistants recommend." },
  { title: "Review system", desc: "A steady flow of real 5-star reviews, on autopilot." },
  { title: "Website design + build", desc: "Fast, bilingual sites built for Google and AI from day one." },
  { title: "Live dashboard", desc: "Real numbers you can watch — not vanity impressions." },
];

export const BOOYAH_STEPS = [
  { title: "Free 15-min check", desc: "We audit your visibility and show you the gaps — no obligation." },
  { title: "Setup + dashboard, day one", desc: "We get to work and you get a live dashboard immediately." },
  { title: "Movement in 30–60 days", desc: "Maps & reviews move first; SEO and AI compound from 90+ days." },
  { title: "Watch real numbers", desc: "Scale, pause, or cancel anytime. Month-to-month, no lock-in." },
];

export const BOOYAH_PROMISES = [
  { title: "Exclusivity", desc: "One client per category per zone. We never sell against you." },
  { title: "No lock-in", desc: "Month-to-month. Cancel anytime — no contracts, no games." },
  { title: "Honest numbers", desc: "A live dashboard of real results, not vanity impressions." },
  { title: "Money-back", desc: "30-day money-back guarantee on the Blueprint." },
];

export const BOOYAH_FAQ = [
  {
    q: "How long until I see results?",
    a: "Maps and reviews usually move in 30–60 days. Search SEO and AI visibility compound from 90 days onward.",
  },
  {
    q: "How is this different from a marketing agency?",
    a: "Most agencies sell ad budget because ads are the easiest place to hide. Booyah builds organic-first visibility you own — and proves it on a live dashboard.",
  },
  {
    q: "Who is the Blueprint for?",
    a: "Operators who'd rather do it themselves with a proven playbook. ~30 minutes a week, with a 100-point scorecard and a 30-day money-back guarantee.",
  },
  {
    q: "Why only a limited number of clients?",
    a: "Exclusivity. We take one client per category per zone so we're never optimizing two competitors against each other.",
  },
  {
    q: "How do I cancel?",
    a: "Done-for-you plans are month-to-month. Cancel anytime from the dashboard — no lock-in.",
  },
  {
    q: "Does it work outside Bangkok / Thailand?",
    a: "Yes. The same playbook works anywhere Google Maps and Search operate. International clients welcome.",
  },
];

// ── Outbound links + attribution ─────────────────────────────────────────────
const BOOYAH_BASE = {
  booking: "https://cal.com/booyah/30min",
  freeCheck: "https://getbooyah.com/check",
  site: "https://getbooyah.com",
} as const;

export type BooyahDestination = keyof typeof BOOYAH_BASE;

/** Append Shifted attribution UTMs (+ optional lead ref) to any Booyah URL. */
export function booyahUrl(dest: BooyahDestination, opts?: { ref?: string; tier?: string }) {
  const url = new URL(BOOYAH_BASE[dest]);
  url.searchParams.set("utm_source", "shifted");
  url.searchParams.set("utm_medium", "marketing_page");
  url.searchParams.set("utm_campaign", "booyah");
  if (opts?.ref) url.searchParams.set("ref", opts.ref);
  if (opts?.tier) url.searchParams.set("tier", opts.tier);
  return url.toString();
}

/** Idol day-rate helper for the "~฿1,300/day" line. */
export const IDOL_DAY_RATE = Math.round((BOOYAH_DFY[0].price ?? 0) / 30);

// ── Page chrome copy (EN + TH). Long body prose (levers/steps/faq) stays EN for
//    now per spec; TODO: TH translation for those arrays. ──────────────────────
export type MarketingLang = "en" | "th";

export function toMarketingLang(v: string | string[] | undefined): MarketingLang {
  const s = Array.isArray(v) ? v[0] : v;
  return s === "th" ? "th" : "en";
}

export const MARKETING_COPY: Record<MarketingLang, Record<string, string>> = {
  en: {
    eyebrow: "Shifted Marketing Solutions — powered by Booyah",
    heroH1: "Don't chase customers. Make customers find you.",
    heroSub:
      "Google Search, Maps, and AI answers — wherever your customers look, you're the first thing they find. No ad budget required.",
    ctaCheck: "Get a free visibility check",
    ctaPackages: "See packages",
    problemTitle: "Stop being invisible",
    problemBody:
      "The problem isn't that you post too little — it's that customers can't find you. Weak agencies sell ad budget because ads are the easiest place to hide. Booyah builds organic-first visibility you actually own.",
    proofTitle: "Receipts, not promises",
    proofBody: "Built on our own businesses first — the Greenstead operator network.",
    leversTitle: "What Booyah does",
    packagesTitle: "Done-for-you packages",
    diyTitle: "Prefer to do it yourself?",
    projectsTitle: "One-time projects",
    howTitle: "How it works",
    promisesTitle: "Our promises",
    finalTitle: "Your next customer is searching right now",
    finalSub: "Get a free visibility check — we'll show you exactly where you're losing them.",
    faqTitle: "Questions, answered",
    formTitle: "Get your free visibility check",
    formBusiness: "Business name",
    formLocation: "Location / area",
    formCategory: "What you sell",
    formContactName: "Your name",
    formContactChannel: "Best way to reach you (LINE / phone / email)",
    formInterest: "What are you most interested in?",
    formMessage: "Anything we should know? (optional)",
    formSubmit: "Get my free check",
    paymentNote: "PromptPay, bank transfer, card. International clients welcome.",
    successTitle: "You're in. Let's get you found.",
    successBody: "Book your free 15-minute visibility check with Booyah — your details are already on their way.",
    successBook: "Book your free check",
    successCheck: "Run an instant check",
  },
  th: {
    eyebrow: "Shifted Marketing Solutions — ขับเคลื่อนโดย Booyah",
    heroH1: "อย่าไล่ตามลูกค้า ทำให้ลูกค้าหาคุณเจอ",
    heroSub:
      "Google Search, Maps และคำตอบจาก AI — ไม่ว่าลูกค้าจะค้นหาที่ไหน คุณคือสิ่งแรกที่เขาเจอ โดยไม่ต้องมีงบโฆษณา",
    ctaCheck: "ขอตรวจการมองเห็นฟรี",
    ctaPackages: "ดูแพ็กเกจ",
    problemTitle: "เลิกเป็นร้านที่ไม่มีใครเห็น",
    // TODO: TH translation
    problemBody:
      "The problem isn't that you post too little — it's that customers can't find you. Weak agencies sell ad budget because ads are the easiest place to hide. Booyah builds organic-first visibility you actually own.",
    proofTitle: "หลักฐาน ไม่ใช่คำสัญญา",
    proofBody: "เริ่มจากธุรกิจของเราเองก่อน — เครือข่ายผู้ประกอบการ Greenstead",
    leversTitle: "Booyah ทำอะไรให้คุณ",
    packagesTitle: "แพ็กเกจแบบทำให้ครบ",
    diyTitle: "อยากลงมือทำเอง?",
    projectsTitle: "งานโปรเจกต์ครั้งเดียวจบ",
    howTitle: "ขั้นตอนการทำงาน",
    promisesTitle: "คำมั่นของเรา",
    finalTitle: "ลูกค้ารายต่อไปของคุณกำลังค้นหาอยู่ตอนนี้",
    finalSub: "ขอตรวจการมองเห็นฟรี — เราจะชี้ให้เห็นว่าคุณกำลังเสียลูกค้าตรงไหน",
    faqTitle: "คำถามที่พบบ่อย",
    formTitle: "ขอตรวจการมองเห็นฟรีของคุณ",
    formBusiness: "ชื่อธุรกิจ",
    formLocation: "ทำเล / พื้นที่",
    formCategory: "คุณขายอะไร",
    formContactName: "ชื่อของคุณ",
    formContactChannel: "ช่องทางติดต่อที่สะดวก (LINE / โทร / อีเมล)",
    formInterest: "คุณสนใจอะไรมากที่สุด?",
    formMessage: "มีอะไรอยากบอกเราไหม? (ไม่บังคับ)",
    formSubmit: "ขอตรวจฟรี",
    paymentNote: "พร้อมเพย์ โอนผ่านธนาคาร บัตรเครดิต ยินดีต้อนรับลูกค้าต่างประเทศ",
    successTitle: "เรียบร้อย มาทำให้คนหาคุณเจอกัน",
    successBody: "จองการตรวจการมองเห็นฟรี 15 นาทีกับ Booyah — ข้อมูลของคุณกำลังส่งถึงทีมแล้ว",
    successBook: "จองการตรวจฟรี",
    successCheck: "ตรวจทันที",
  },
};
