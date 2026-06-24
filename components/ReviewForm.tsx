import { Textarea, buttonClass } from "./ui";

/** Compact two-way review form. `action` is a pre-bound server action. */
export function ReviewForm({
  action,
  placeholder,
  cta = "Submit review",
}: {
  action: (formData: FormData) => Promise<void>;
  placeholder?: string;
  cta?: string;
}) {
  return (
    <form action={action} className="mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm text-stone-600">Rating</label>
        <select
          name="rating"
          defaultValue="5"
          className="h-9 rounded-[var(--radius-base)] border border-stone-300 bg-paper px-2 text-sm focus:border-ink focus:outline-none"
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} ★
            </option>
          ))}
        </select>
      </div>
      <Textarea
        name="comment"
        className="min-h-16 text-sm"
        placeholder={placeholder ?? "How was it? (optional)"}
        maxLength={500}
      />
      <button type="submit" className={buttonClass("primary", "sm")}>
        {cta}
      </button>
    </form>
  );
}
