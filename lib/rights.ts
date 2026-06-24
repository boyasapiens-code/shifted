import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

// Category taxonomy (from content/rights/index.md). Stable ids = URL segments.
export const RIGHTS_CATEGORIES = [
  { id: "pay-and-money", name: "Pay & money", scope: "Minimum wage, overtime, service charge & tips, lawful deductions, payslips, social security, bonuses." },
  { id: "time-and-rest", name: "Time & rest", scope: "Working hours, breaks, weekly day off, public holidays, annual leave, sick leave, personal & family leave." },
  { id: "starting-a-job", name: "Starting a job", scope: "Employment contracts, probation, what must be agreed in writing, work-from-home rules, foreign worker basics." },
  { id: "ending-a-job", name: "Ending a job", scope: "Resignation, termination, notice periods, severance pay, final pay, what counts as fair dismissal." },
  { id: "conduct-and-disputes", name: "Conduct & disputes", scope: "Warnings & discipline, workplace harassment, unfair dismissal, how the Labour Court works, where to complain." },
  { id: "hospitality-and-retail", name: "Hospitality & retail", scope: "Service charge distribution, tips, shift work, daily/casual workers, split shifts, uniform & training costs." },
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
  lang: string;
  last_reviewed: string;
  review_cadence: string;
  status: string;
  related: string[];
  keywords: string[];
  sources: RightsSource[];
  sections: {
    quick: string;
    law: string;
    employees: string;
    employers: string;
    myths: string;
    good: string;
  };
}

const CONTENT_DIR = path.join(process.cwd(), "content", "rights", "en");

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
      current = h2[1].trim().toLowerCase();
    } else {
      buf.push(line);
    }
  }
  flush();

  // "Both sides" splits into For employees / For employers via ### headings.
  let employees = "";
  let employers = "";
  const both = out["both sides"] ?? "";
  for (const part of both.split(/^###\s+/m)) {
    const nl = part.indexOf("\n");
    if (nl < 0) continue;
    const head = part.slice(0, nl).trim().toLowerCase();
    const content = part.slice(nl + 1).trim();
    if (head.includes("employee")) employees = content;
    else if (head.includes("employer")) employers = content;
  }

  return {
    quick: out["the quick version"] ?? "",
    law: out["what the law says"] ?? "",
    employees,
    employers,
    myths: out["myths & gray areas"] ?? "",
    good: out["what good looks like"] ?? "",
  };
}

function loadFile(slug: string): RightsArticle {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, `${slug}.md`), "utf8");
  const { data, content } = matter(raw);
  const article: RightsArticle = {
    slug: data.slug ?? slug,
    title: data.title ?? slug,
    summary: data.summary ?? "",
    category: data.category ?? "pay-and-money",
    audience: data.audience ?? "both",
    lang: data.lang ?? "en",
    last_reviewed: data.last_reviewed ? String(data.last_reviewed) : "",
    review_cadence: data.review_cadence ?? "quarterly",
    status: data.status ?? "draft",
    related: data.related ?? [],
    keywords: data.seo?.keywords ?? [],
    sources: data.sources ?? [],
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

export function getAllRightsArticles(): RightsArticle[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => loadFile(f.replace(/\.md$/, "")))
    .filter((a) => a.status !== "draft");
}

export function getRightsArticle(slug: string): RightsArticle | null {
  try {
    const a = loadFile(slug);
    return a.status === "draft" ? null : a;
  } catch {
    return null;
  }
}

export function getRightsCategory(id: string) {
  return RIGHTS_CATEGORIES.find((c) => c.id === id) ?? null;
}

/** True when an article is past its review cadence (staleness badge). */
export function isRightsStale(article: RightsArticle): boolean {
  if (!article.last_reviewed || article.review_cadence === "on-law-change") return false;
  const days = article.review_cadence === "monthly" ? 30 : 90; // quarterly default
  const reviewed = new Date(article.last_reviewed).getTime();
  return Date.now() - reviewed > days * 24 * 60 * 60 * 1000;
}
