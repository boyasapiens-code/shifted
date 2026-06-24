import { Textarea, buttonClass } from "./ui";

/**
 * Structured reference (shared reference network) — employer-only, visible to
 * other employers. `action` is a pre-bound server action.
 */
export function ReferenceForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm text-stone-600">Reliability</label>
        <select
          name="reliability"
          defaultValue="5"
          className="h-9 rounded-[var(--radius-base)] border border-stone-300 bg-paper px-2 text-sm focus:border-ink focus:outline-none"
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} / 5
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input type="checkbox" name="would_rehire" defaultChecked className="h-4 w-4 accent-[var(--color-ink)]" />
        Would re-hire
      </label>
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input type="checkbox" name="no_show" className="h-4 w-4 accent-[var(--color-ink)]" />
        No-showed / abandoned a shift
      </label>
      <Textarea
        name="conduct_note"
        className="min-h-16 text-sm"
        placeholder="Conduct notes — visible to other employers in the network."
        maxLength={500}
      />
      <button type="submit" className={buttonClass("primary", "sm")}>
        Submit reference
      </button>
    </form>
  );
}
