import { marked } from "marked";
import { cn } from "./ui";
import type { RightsArticle, RightsSource } from "@/lib/rights";
import { isRightsStale } from "@/lib/rights";

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
}: {
  employees: string;
  employers: string;
}) {
  return (
    <div className="mt-3 grid gap-4 sm:grid-cols-2">
      <div className="rounded-[var(--radius-card)] border border-stone-200 bg-stone-50 p-5">
        <p className="eyebrow mb-2">For employees</p>
        <RightsProse md={employees} />
      </div>
      <div className="rounded-[var(--radius-card)] border border-stone-200 bg-stone-50 p-5">
        <p className="eyebrow mb-2">For employers</p>
        <RightsProse md={employers} />
      </div>
    </div>
  );
}

/** Last-reviewed badge + staleness flag. */
export function LastReviewed({ article }: { article: RightsArticle }) {
  const stale = isRightsStale(article);
  return (
    <span className="inline-flex items-center gap-2 text-xs text-stone-500">
      <span>
        Reviewed{" "}
        {new Date(article.last_reviewed).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </span>
      {article.status === "legal-review" && (
        <span className="rounded-full bg-warning/10 px-2 py-0.5 font-medium text-[#9a6b00]">
          In legal review
        </span>
      )}
      {stale && (
        <span className="rounded-full bg-danger/10 px-2 py-0.5 font-medium text-danger">
          Review due
        </span>
      )}
    </span>
  );
}

/** Fixed disclaimer required on every article (not hand-written by authors). */
export function RightsDisclaimer() {
  return (
    <div className="mt-10 rounded-[var(--radius-card)] border border-stone-200 bg-stone-50 p-5 text-sm text-stone-600">
      <p className="font-medium text-ink">Plain-language summary, not legal advice.</p>
      <p className="mt-1">
        Laws and figures change. For your situation, confirm with the source or a
        licensed Thai lawyer. Department of Labour Protection &amp; Welfare hotline:{" "}
        <span className="font-medium text-ink">1506</span>. Disputes can go to the
        Labour Court.
      </p>
    </div>
  );
}

/** Sources as footnote links. */
export function SourceList({ sources }: { sources: RightsSource[] }) {
  if (!sources.length) return null;
  return (
    <div className="mt-8">
      <p className="eyebrow mb-2">Sources</p>
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
