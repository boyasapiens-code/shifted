import Link from "next/link";
import { marked } from "marked";
import { cn } from "./ui";
import type { RightsArticle, RightsSource, RightsLang } from "@/lib/rights";
import { isRightsStale, RIGHTS_COPY } from "@/lib/rights";

/** Renders a section's Markdown (bullets, bold, links) as styled prose. */
export function RightsProse({ md, className }: { md: string; className?: string }) {
  if (!md) return null;
  const html = marked.parse(md, { async: false }) as string;
  return (
    <div
      className={cn("rights-prose", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** "For employees / For employers" — two-column card, stacked on mobile. */
export function BothSides({
  employees,
  employers,
  lang = "en",
}: {
  employees: string;
  employers: string;
  lang?: RightsLang;
}) {
  const t = RIGHTS_COPY[lang];
  return (
    <div className="mt-3 grid gap-4 sm:grid-cols-2">
      <div className="rounded-[var(--radius-card)] border border-stone-200 bg-stone-50 p-5">
        <p className="eyebrow mb-2">{t.forEmployees}</p>
        <RightsProse md={employees} />
      </div>
      <div className="rounded-[var(--radius-card)] border border-stone-200 bg-stone-50 p-5">
        <p className="eyebrow mb-2">{t.forEmployers}</p>
        <RightsProse md={employers} />
      </div>
    </div>
  );
}

/** Last-reviewed badge + staleness flag. */
export function LastReviewed({
  article,
  lang = "en",
}: {
  article: RightsArticle;
  lang?: RightsLang;
}) {
  const t = RIGHTS_COPY[lang];
  const stale = isRightsStale(article);
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-xs text-stone-500">
      <span>
        {t.reviewed}{" "}
        {new Date(article.last_reviewed).toLocaleDateString(t.dateLocale, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </span>
      {article.status === "legal-review" && (
        <span className="rounded-full bg-warning/10 px-2 py-0.5 font-medium text-[#9a6b00]">
          {t.inLegalReview}
        </span>
      )}
      {stale && (
        <span className="rounded-full bg-danger/10 px-2 py-0.5 font-medium text-danger">
          {t.reviewDue}
        </span>
      )}
    </span>
  );
}

/** Fixed disclaimer required on every article (not hand-written by authors). */
export function RightsDisclaimer({ lang = "en" }: { lang?: RightsLang }) {
  const t = RIGHTS_COPY[lang];
  return (
    <div className="mt-10 rounded-[var(--radius-card)] border border-stone-200 bg-stone-50 p-5 text-sm text-stone-600">
      <p className="font-medium text-ink">{t.disclaimerTitle}</p>
      <p className="mt-1">
        {t.disclaimerBody}{" "}
        <span className="font-medium text-ink">1506</span>. {t.hotlineNote}
      </p>
    </div>
  );
}

/** Sources as footnote links. */
export function SourceList({
  sources,
  lang = "en",
}: {
  sources: RightsSource[];
  lang?: RightsLang;
}) {
  if (!sources.length) return null;
  const t = RIGHTS_COPY[lang];
  return (
    <div className="mt-8">
      <p className="eyebrow mb-2">{t.sources}</p>
      <ul className="space-y-1 text-sm">
        {sources.map((s) => (
          <li key={s.url}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-signal hover:underline"
            >
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** EN | ไทย switch — links to the same path with/without ?lang=th. */
export function RightsLangToggle({ path, lang }: { path: string; lang: RightsLang }) {
  const opts: { code: RightsLang; label: string; href: string }[] = [
    { code: "en", label: "EN", href: path },
    { code: "th", label: "ไทย", href: `${path}?lang=th` },
  ];
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-stone-200 p-0.5 text-xs">
      {opts.map((o) => (
        <Link
          key={o.code}
          href={o.href}
          hrefLang={o.code}
          className={cn(
            "rounded-full px-2.5 py-1 font-medium transition",
            lang === o.code ? "bg-ink text-paper" : "text-stone-500 hover:text-ink",
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
