import { createPublicClient } from "@/lib/supabase/public";

export type RightsLang = "en" | "th";
export const RIGHTS_LANGS: RightsLang[] = ["en", "th"];

/** Normalize an arbitrary ?lang value to a supported language (default en). */
export function toRightsLang(v: string | string[] | undefined): RightsLang {
  const s = Array.isArray(v) ? v[0] : v;
  return s === "th" ? "th" : "en";
}

// All user-facing chrome (labels, disclaimer, CTA) in both languages, so the
// page shell speaks the reader's language — not just the article body.
export const RIGHTS_COPY: Record<RightsLang, {
  eyebrow: string;
  hubTitle: string;
  hubLede: string;
  articles: (n: number) => string;
  minRead: (n: number) => string;
  filterAll: string;
  allTopics: string;
  workersNote: string;
  employersNote: string;
  comingSoon: string;
  category: string;
  backToHub: string;
  sectionQuick: string;
  sectionLaw: string;
  sectionBoth: string;
  sectionMyths: string;
  sectionGood: string;
  forEmployees: string;
  forEmployers: string;
  sources: string;
  reviewed: string;
  inLegalReview: string;
  reviewDue: string;
  disclaimerTitle: string;
  disclaimerBody: string;
  hotlineNote: string;
  related: string;
  ctaTitle: string;
  ctaBody: string;
  findWork: string;
  hireTalent: string;
  audience: Record<"both" | "employee" | "employer", string>;
  dateLocale: string;
}> = {
  en: {
    eyebrow: "Know Your Rights",
    hubTitle: "Thai workplace law, in plain language.",
    hubLede:
      "Current rules that shape work in Thailand — explained fairly for both sides, sourced, and dated. Not legal advice; a clear starting point.",
    articles: (n) => `${n} ${n === 1 ? "article" : "articles"}`,
    minRead: (n) => `${n} min read`,
    filterAll: "All",
    allTopics: "All topics",
    workersNote: "What you're owed — pay, hours, leave, and fair treatment.",
    employersNote: "What you must get right — the same rules, from the operator's side.",
    comingSoon: "Coming soon.",
    category: "Category",
    backToHub: "← Know Your Rights",
    sectionQuick: "The quick version",
    sectionLaw: "What the law says",
    sectionBoth: "Both sides",
    sectionMyths: "Myths & gray areas",
    sectionGood: "What good looks like",
    forEmployees: "For employees",
    forEmployers: "For employers",
    sources: "Sources",
    reviewed: "Reviewed",
    inLegalReview: "In legal review",
    reviewDue: "Review due",
    disclaimerTitle: "Plain-language summary, not legal advice.",
    disclaimerBody:
      "Laws and figures change. For your situation, confirm with the source or a licensed Thai lawyer. Department of Labour Protection & Welfare hotline:",
    hotlineNote: "Disputes can go to the Labour Court.",
    related: "Related",
    ctaTitle: "Know your rights, then make your move.",
    ctaBody:
      "SHIFTED connects verified employers with pre-screened workers — fairly, both sides.",
    findWork: "Find work",
    hireTalent: "Hire talent",
    audience: {
      both: "For both sides",
      employee: "For employees",
      employer: "For employers",
    },
    dateLocale: "en-GB",
  },
  th: {
    eyebrow: "รู้สิทธิ์ของคุณ",
    hubTitle: "กฎหมายแรงงานไทย ฉบับเข้าใจง่าย",
    hubLede:
      "กฎเกณฑ์ปัจจุบันที่กำหนดการทำงานในไทย — อธิบายอย่างเป็นธรรมสำหรับทั้งสองฝ่าย พร้อมแหล่งอ้างอิงและวันที่ ไม่ใช่คำปรึกษาทางกฎหมาย แต่เป็นจุดเริ่มต้นที่ชัดเจน",
    articles: (n) => `${n} บทความ`,
    minRead: (n) => `อ่าน ${n} นาที`,
    filterAll: "ทั้งหมด",
    allTopics: "ทุกหัวข้อ",
    workersNote: "สิ่งที่คุณพึงได้รับ — ค่าจ้าง ชั่วโมงงาน วันลา และการปฏิบัติอย่างเป็นธรรม",
    employersNote: "สิ่งที่คุณต้องทำให้ถูกต้อง — กฎเดียวกัน จากมุมของผู้ประกอบการ",
    comingSoon: "เร็ว ๆ นี้",
    category: "หมวดหมู่",
    backToHub: "← รู้สิทธิ์ของคุณ",
    sectionQuick: "สรุปสั้น ๆ",
    sectionLaw: "กฎหมายว่าอย่างไร",
    sectionBoth: "ทั้งสองฝ่าย",
    sectionMyths: "ความเข้าใจผิดและจุดที่คลุมเครือ",
    sectionGood: "แนวทางที่ดีควรเป็นอย่างไร",
    forEmployees: "สำหรับลูกจ้าง",
    forEmployers: "สำหรับนายจ้าง",
    sources: "แหล่งอ้างอิง",
    reviewed: "ทบทวนเมื่อ",
    inLegalReview: "อยู่ระหว่างการตรวจทานทางกฎหมาย",
    reviewDue: "ถึงกำหนดทบทวน",
    disclaimerTitle: "สรุปแบบเข้าใจง่าย ไม่ใช่คำปรึกษาทางกฎหมาย",
    disclaimerBody:
      "กฎหมายและตัวเลขเปลี่ยนแปลงได้ สำหรับกรณีของคุณ โปรดตรวจสอบกับแหล่งอ้างอิงหรือทนายความไทยที่มีใบอนุญาต สายด่วนกรมสวัสดิการและคุ้มครองแรงงาน:",
    hotlineNote: "ข้อพิพาทสามารถนำขึ้นสู่ศาลแรงงานได้",
    related: "บทความที่เกี่ยวข้อง",
    ctaTitle: "รู้สิทธิ์ของคุณ แล้วก้าวต่อไป",
    ctaBody:
      "SHIFTED เชื่อมนายจ้างที่ผ่านการตรวจสอบกับคนทำงานที่ผ่านการคัดกรอง — อย่างเป็นธรรมทั้งสองฝ่าย",
    findWork: "หางาน",
    hireTalent: "หาคนทำงาน",
    audience: {
      both: "สำหรับทั้งสองฝ่าย",
      employee: "สำหรับลูกจ้าง",
      employer: "สำหรับนายจ้าง",
    },
    dateLocale: "th-TH",
  },
};

/** Localized category name + scope. */
export function categoryLabel(
  cat: (typeof RIGHTS_CATEGORIES)[number],
  lang: RightsLang,
) {
  return lang === "th"
    ? { name: cat.name_th, scope: cat.scope_th }
    : { name: cat.name, scope: cat.scope };
}

// Category taxonomy (from content/rights/index.md). Stable ids = URL segments.
// Names carried in both languages — the taxonomy is shared, only labels differ.
export const RIGHTS_CATEGORIES = [
  {
    id: "pay-and-money",
    name: "Pay & money",
    name_th: "ค่าจ้างและเงิน",
    scope: "Minimum wage, overtime, service charge & tips, lawful deductions, payslips, social security, bonuses.",
    scope_th: "ค่าจ้างขั้นต่ำ ค่าล่วงเวลา ค่าบริการและทิป การหักเงินที่ชอบด้วยกฎหมาย สลิปเงินเดือน ประกันสังคม โบนัส",
  },
  {
    id: "time-and-rest",
    name: "Time & rest",
    name_th: "เวลาและการพักผ่อน",
    scope: "Working hours, breaks, weekly day off, public holidays, annual leave, sick leave, personal & family leave.",
    scope_th: "ชั่วโมงทำงาน เวลาพัก วันหยุดประจำสัปดาห์ วันหยุดนักขัตฤกษ์ วันลาพักร้อน ลาป่วย ลากิจและลาเพื่อครอบครัว",
  },
  {
    id: "starting-a-job",
    name: "Starting a job",
    name_th: "เริ่มงานใหม่",
    scope: "Employment contracts, probation, what must be agreed in writing, work-from-home rules, foreign worker basics.",
    scope_th: "สัญญาจ้าง ทดลองงาน สิ่งที่ต้องตกลงเป็นลายลักษณ์อักษร กฎการทำงานจากที่บ้าน พื้นฐานสำหรับแรงงานต่างชาติ",
  },
  {
    id: "ending-a-job",
    name: "Ending a job",
    name_th: "การสิ้นสุดการจ้างงาน",
    scope: "Resignation, termination, notice periods, severance pay, final pay, what counts as fair dismissal.",
    scope_th: "การลาออก การเลิกจ้าง ระยะเวลาบอกกล่าวล่วงหน้า ค่าชดเชย เงินงวดสุดท้าย สิ่งที่นับเป็นการเลิกจ้างที่เป็นธรรม",
  },
  {
    id: "conduct-and-disputes",
    name: "Conduct & disputes",
    name_th: "วินัยและข้อพิพาท",
    scope: "Warnings & discipline, workplace harassment, unfair dismissal, how the Labour Court works, where to complain.",
    scope_th: "หนังสือเตือนและการลงโทษทางวินัย การคุกคามในที่ทำงาน การเลิกจ้างไม่เป็นธรรม ศาลแรงงานทำงานอย่างไร ร้องเรียนได้ที่ไหน",
  },
  {
    id: "hospitality-and-retail",
    name: "Hospitality & retail",
    name_th: "งานบริการและค้าปลีก",
    scope: "Service charge distribution, tips, shift work, daily/casual workers, split shifts, uniform & training costs.",
    scope_th: "การแบ่งค่าบริการ ทิป งานเป็นกะ ลูกจ้างรายวัน/ชั่วคราว กะแบ่งช่วง ค่าเครื่องแบบและค่าฝึกอบรม",
  },
] as const;

export type RightsCategoryId = (typeof RIGHTS_CATEGORIES)[number]["id"];

export interface RightsSource {
  title: string;
  url: string;
}

export interface RightsArticle {
  slug: string;
  title: string;
  summary: string;
  category: string;
  audience: "both" | "employee" | "employer";
  lang: RightsLang;
  last_reviewed: string;
  review_cadence: string;
  status: string;
  related: string[];
  keywords: string[];
  sources: RightsSource[];
  /** Languages this article exists in (en is always present; th when translated). */
  langs: RightsLang[];
  sections: {
    quick: string;
    law: string;
    employees: string;
    employers: string;
    myths: string;
    good: string;
  };
}

// DB row shape (rights_articles, migration 0033) — sections are already
// split into columns (the migration script did the same H2/H3-splitting
// that used to happen in parseSections() at read time, once, up front),
// so no Markdown parsing happens here at all anymore. Exported (with `id`)
// so /admin/content can query+edit the raw row directly.
export type RightsRow = {
  id: string;
  slug: string;
  lang: string;
  title: string;
  summary: string;
  category: string;
  audience: string;
  last_reviewed: string | null;
  review_cadence: string;
  status: string;
  related: string[];
  keywords: string[];
  sources: RightsSource[];
  disclaimer: boolean;
  section_quick: string;
  section_law: string;
  section_employees: string;
  section_employers: string;
  section_myths: string;
  section_good: string;
};

function toArticle(row: RightsRow, langs: RightsLang[]): RightsArticle {
  const article: RightsArticle = {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    category: row.category,
    audience: row.audience as RightsArticle["audience"],
    lang: row.lang as RightsLang,
    last_reviewed: row.last_reviewed ?? "",
    review_cadence: row.review_cadence,
    status: row.status,
    related: row.related,
    keywords: row.keywords,
    sources: row.sources,
    langs,
    sections: {
      quick: row.section_quick,
      law: row.section_law,
      employees: row.section_employees,
      employers: row.section_employers,
      myths: row.section_myths,
      good: row.section_good,
    },
  };

  // Guardrail: a published article MUST have sources, a review date, disclaimer.
  // Now enforced live (on read) instead of at build time — an admin
  // publishing an incomplete article finds out immediately, not on the next
  // deploy.
  if (article.status === "published") {
    if (!article.sources.length || !article.last_reviewed || !row.disclaimer) {
      throw new Error(
        `Rights article "${row.slug}" is published but missing sources, last_reviewed, or disclaimer.`,
      );
    }
  }
  return article;
}

/** Which languages a given article slug has rows for (en is canonical). */
export async function articleLangs(slug: string): Promise<RightsLang[]> {
  const supabase = createPublicClient();
  const { data } = await supabase.from("rights_articles").select("lang").eq("slug", slug);
  return RIGHTS_LANGS.filter((l) => (data ?? []).some((r) => r.lang === l));
}

async function loadRow(slug: string, lang: RightsLang = "en"): Promise<RightsArticle> {
  const supabase = createPublicClient();
  // Fall back to English if the requested language isn't translated yet.
  let effectiveLang: RightsLang = lang;
  let { data: row } = await supabase
    .from("rights_articles")
    .select("*")
    .eq("slug", slug)
    .eq("lang", lang)
    .maybeSingle();
  if (!row && lang !== "en") {
    effectiveLang = "en";
    ({ data: row } = await supabase
      .from("rights_articles")
      .select("*")
      .eq("slug", slug)
      .eq("lang", "en")
      .maybeSingle());
  }
  if (!row) throw new Error(`Rights article "${slug}" not found for lang "${effectiveLang}".`);
  const langs = await articleLangs(slug);
  return toArticle(row as RightsRow, langs);
}

export async function getAllRightsArticles(lang: RightsLang = "en"): Promise<RightsArticle[]> {
  const supabase = createPublicClient();
  // en is the canonical set of slugs — every article has (at least) an en row.
  const { data: enRows } = await supabase.from("rights_articles").select("slug").eq("lang", "en");
  const slugs = (enRows ?? []).map((r) => r.slug);
  const articles = await Promise.all(slugs.map((slug) => loadRow(slug, lang)));
  return articles.filter((a) => a.status !== "draft");
}

export async function getRightsArticle(
  slug: string,
  lang: RightsLang = "en",
): Promise<RightsArticle | null> {
  try {
    const a = await loadRow(slug, lang);
    return a.status === "draft" ? null : a;
  } catch {
    return null;
  }
}

export function getRightsCategory(id: string) {
  return RIGHTS_CATEGORIES.find((c) => c.id === id) ?? null;
}

/** Estimated reading time. Thai text has no word spaces, so count characters
 *  (~600/min) there; elsewhere count words (~200/min). Floor of 2 minutes. */
export function readMinutes(article: RightsArticle): number {
  const text = Object.values(article.sections).join(" ");
  const n =
    article.lang === "th"
      ? text.replace(/\s+/g, "").length / 600
      : text.split(/\s+/).filter(Boolean).length / 200;
  return Math.max(2, Math.round(n));
}

/** True when an article is past its review cadence (staleness badge). */
export function isRightsStale(article: RightsArticle): boolean {
  if (!article.last_reviewed || article.review_cadence === "on-law-change") return false;
  const days = article.review_cadence === "monthly" ? 30 : 90; // quarterly default
  const reviewed = new Date(article.last_reviewed).getTime();
  return Date.now() - reviewed > days * 24 * 60 * 60 * 1000;
}
