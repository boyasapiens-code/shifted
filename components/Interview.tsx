import { Badge } from "./ui";
import {
  CATEGORY_LABEL,
  FORMAT_LABEL,
  type Question,
  type SelectOption,
  type ScaleOptions,
} from "@/lib/interview";

function selectOptions(q: Question): SelectOption[] {
  return Array.isArray(q.options) ? (q.options as SelectOption[]) : [];
}
function scaleOf(q: Question): ScaleOptions {
  return q.options as ScaleOptions;
}

/** One answerable question field (named `q:<id>`), used in the apply form. */
export function QuestionField({
  q,
  required = false,
  index,
}: {
  q: Question;
  required?: boolean;
  index: number;
}) {
  const name = `q:${q.id}`;
  return (
    <div className="rounded-[var(--radius-card)] border border-stone-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink">
          {index}. {q.prompt}
        </p>
        {required && <Badge tone="amber">Required</Badge>}
      </div>

      {(q.answer_format === "single_select" || q.answer_format === "yes_no") && (
        <div className="mt-3 space-y-1.5">
          {selectOptions(q).map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm text-stone-700">
              <input type="radio" name={name} value={o.value} required={required} className="accent-[var(--color-signal)]" />
              {o.label}
            </label>
          ))}
        </div>
      )}

      {q.answer_format === "scale" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-stone-400">{scaleOf(q).minLabel ?? scaleOf(q).min}</span>
          {Array.from({ length: scaleOf(q).max - scaleOf(q).min + 1 }, (_, i) => scaleOf(q).min + i).map((n) => (
            <label key={n} className="flex flex-col items-center text-xs text-stone-600">
              <input type="radio" name={name} value={String(n)} required={required} className="accent-[var(--color-signal)]" />
              {n}
            </label>
          ))}
          <span className="text-xs text-stone-400">{scaleOf(q).maxLabel ?? scaleOf(q).max}</span>
        </div>
      )}

      {q.answer_format === "short_structured" && (
        <textarea
          name={name}
          rows={2}
          maxLength={(q.options as { maxLength?: number }).maxLength ?? 280}
          required={required}
          placeholder="Your answer…"
          className="mt-3 w-full rounded-[var(--radius-base)] border border-stone-200 p-2 text-sm"
        />
      )}
    </div>
  );
}

/** A read-only preview chip for a question (used in the job page + builder). */
export function QuestionPreview({ q }: { q: Question }) {
  return (
    <div className="rounded-[var(--radius-base)] border border-stone-200 bg-stone-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-stone-400">{CATEGORY_LABEL[q.category]}</span>
        <span className="text-[11px] text-stone-400">· {FORMAT_LABEL[q.answer_format]}</span>
      </div>
      <p className="mt-1 text-sm text-ink">{q.prompt}</p>
    </div>
  );
}
