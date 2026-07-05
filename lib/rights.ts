import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

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

const contentDir = (lang: RightsLang) =>
  path.join(process.cwd(), "content", "rights", lang);

// Heading → canonical section key, matched in both languages so a Thai article
// can use Thai H2s. Compared lower-cased and trimmed.
const SECTION_HEADINGS: Record<string, "quick" | "law" | "both" | "myths" | "good"> = {
  "the quick version": "quick",
  "สรุปสั้น ๆ": "quick",
  "สรุปสั้นๆ": "quick",
  "what the law says": "law",
  "กฎหมายว่าอย่างไร": "law",
  "both sides": "both",
  "ทั้งสองฝ่าย": "both",
  "myths & gray areas": "myths",
  "ความเข้าใจผิดและจุดที่คลุมเครือ": "myths",
  "what good looks like": "good",
  "แนวทางที่ดีควรเป็นอย่างไร": "good",
};

function parseSections(body: string) {
  const out: Record<string, string> = {};
  let current = "";
  const buf: string[] = [];
  const flush = () => {
    if (current) out[current] = buf.splice(0).join("\n").trim();
    else buf.splice(0);
  };
  for (const line of body.split("\n")) {
    const h2 = line.match(/^##\s+(.+)/);
    if (h2) {
      flush();
      const key = SECTION_HEADINGS[h2[1].trim().toLowerCase()] ?? h2[1].trim().toLowerCase();
      current = key;
    } else {
      buf.push(line);
    }
  }
  flush();

  // "Both sides" splits into For employees / For employers via ### headings
  // (English "employee"/"employer" or Thai "ลูกจ้าง"/"นายจ้าง").
  let employees = "";
  let employers = "";
  const both = out["both"] ?? "";
  for (const part of both.split(/^###\s+/m)) {
    const nl = part.indexOf("\n");
    if (nl < 0) continue;
    const head = part.slice(0, nl).trim().toLowerCase();
    const content = part.slice(nl + 1).trim();
    if (head.includes("employee") || head.includes("ลูกจ้าง")) employees = content;
    else if (head.includes("employer") || head.includes("นายจ้าง")) employers = content;
  }

  return {
    quick: out["quick"] ?? "",
    law: out["law"] ?? "",
    employees,
    employers,
    myths: out["myths"] ?? "",
    good: out["good"] ?? "",
  };
}

/** Which languages a given article slug has files for (en is canonical). */
export function articleLangs(slug: string): RightsLang[] {
  return RIGHTS_LANGS.filter((l) => fs.existsSync(path.join(contentDir(l), `${slug}.md`)));
}

function loadFile(slug: string, lang: RightsLang = "en"): RightsArticle {
  // Fall back to English if the requested language isn't translated yet.
  const file = path.join(contentDir(lang), `${slug}.md`);
  const effectiveLang: RightsLang = fs.existsSync(file) ? lang : "en";
  const raw = fs.readFileSync(path.join(contentDir(effectiveLang), `${slug}.md`), "utf8");
  const { data, content } = matter(raw);
  const article: RightsArticle = {
    slug: data.slug ?? slug,
    title: data.title ?? slug,
    summary: data.summary ?? "",
    category: data.category ?? "pay-and-money",
    audience: data.audience ?? "both",
    lang: effectiveLang,
    last_reviewed: data.last_reviewed ? String(data.last_reviewed) : "",
    review_cadence: data.review_cadence ?? "quarterly",
    status: data.status ?? "draft",
    related: data.related ?? [],
    keywords: data.seo?.keywords ?? [],
    sources: data.sources ?? [],
    langs: articleLangs(slug),
    sections: parseSections(content),
  };

  // Guardrail: a published article MUST have sources, a review date, disclaimer.
  if (article.status === "published") {
    if (!article.sources.length || !article.last_reviewed || data.disclaimer !== true) {
      throw new Error(
        `Rights article "${slug}" is published but missing sources, last_reviewed, or disclaimer.`,
      );
    }
  }
  return article;
}

export function getAllRightsArticles(lang: RightsLang = "en"): RightsArticle[] {
  const dir = contentDir("en"); // en is the canonical set of slugs
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => loadFile(f.replace(/\.md$/, ""), lang))
    .filter((a) => a.status !== "draft");
}

export function getRightsArticle(slug: string, lang: RightsLang = "en"): RightsArticle | null {
  try {
    const a = loadFile(slug, lang);
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
