import { Field, Input, Select, Textarea, buttonClass } from "@/components/ui";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { fromList, linesFromSources } from "@/lib/admin-content-format";
import { RIGHTS_CATEGORIES, type RightsRow } from "@/lib/rights";

export function RightsArticleForm({
  initial,
  action,
  deleteAction,
  errorMessage,
}: {
  initial: RightsRow | null;
  action: (formData: FormData) => Promise<void>;
  deleteAction?: () => Promise<void>;
  errorMessage?: string;
}) {
  return (
    <div className="mt-8">
      {errorMessage && (
        <p className="mb-5 rounded-[var(--radius-base)] border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {errorMessage}
        </p>
      )}

      {/* Two separate <form>s, side by side in the UI — a <form> can't
          nest another <form>, so Save and Delete can't share one. */}
      <form action={action} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Slug" hint="URL segment. Same slug across languages links them as translations.">
            <Input name="slug" required defaultValue={initial?.slug} placeholder="e.g. minimum-wage-and-service-charge" />
          </Field>
          <Field label="Language">
            <Select name="lang" defaultValue={initial?.lang ?? "en"}>
              <option value="en">English</option>
              <option value="th">Thai</option>
            </Select>
          </Field>
        </div>

        <Field label="Title">
          <Input name="title" required defaultValue={initial?.title} />
        </Field>
        <Field label="Summary">
          <Textarea name="summary" defaultValue={initial?.summary} className="min-h-20" />
        </Field>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Category">
            <Select name="category" defaultValue={initial?.category ?? RIGHTS_CATEGORIES[0].id}>
              {RIGHTS_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Audience">
            <Select name="audience" defaultValue={initial?.audience ?? "both"}>
              <option value="both">Both sides</option>
              <option value="employee">Employees</option>
              <option value="employer">Employers</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={initial?.status ?? "draft"}>
              <option value="draft">Draft (hidden)</option>
              <option value="legal-review">In legal review (public)</option>
              <option value="published">Published (public, fully sourced)</option>
            </Select>
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Last reviewed">
            <Input type="date" name="last_reviewed" defaultValue={initial?.last_reviewed ?? ""} />
          </Field>
          <Field label="Review cadence">
            <Select name="review_cadence" defaultValue={initial?.review_cadence ?? "quarterly"}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="on-law-change">On law change</option>
            </Select>
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            name="disclaimer"
            defaultChecked={initial?.disclaimer ?? false}
            className="h-4 w-4 accent-[var(--color-ink)]"
          />
          Sourced and dated — required before setting status to Published
        </label>

        <Field label="Related articles" hint="Comma-separated slugs">
          <Input name="related" defaultValue={fromList(initial?.related)} />
        </Field>
        <Field label="SEO keywords" hint="Comma-separated">
          <Input name="keywords" defaultValue={fromList(initial?.keywords)} />
        </Field>
        <Field label="Sources" hint='One per line: "Title | https://url"'>
          <Textarea name="sources" defaultValue={linesFromSources(initial?.sources)} className="min-h-20 font-mono text-xs" />
        </Field>

        <div className="border-t border-stone-200 pt-5">
          <p className="eyebrow mb-3">Body (Markdown)</p>
          <div className="space-y-5">
            <Field label="The quick version">
              <Textarea name="section_quick" defaultValue={initial?.section_quick} className="min-h-24 font-mono text-xs" />
            </Field>
            <Field label="What the law says">
              <Textarea name="section_law" defaultValue={initial?.section_law} className="min-h-32 font-mono text-xs" />
            </Field>
            <Field label="Both sides — for employees">
              <Textarea name="section_employees" defaultValue={initial?.section_employees} className="min-h-24 font-mono text-xs" />
            </Field>
            <Field label="Both sides — for employers">
              <Textarea name="section_employers" defaultValue={initial?.section_employers} className="min-h-24 font-mono text-xs" />
            </Field>
            <Field label="Myths & gray areas">
              <Textarea name="section_myths" defaultValue={initial?.section_myths} className="min-h-24 font-mono text-xs" />
            </Field>
            <Field label="What good looks like">
              <Textarea name="section_good" defaultValue={initial?.section_good} className="min-h-24 font-mono text-xs" />
            </Field>
          </div>
        </div>

        <div className="pt-2">
          <button type="submit" className={buttonClass("primary", "lg")}>Save</button>
        </div>
      </form>

      {deleteAction && (
        <form action={deleteAction} className="mt-4 border-t border-stone-200 pt-4">
          <ConfirmSubmitButton confirmMessage={`Delete "${initial?.title ?? initial?.slug}"? This can't be undone.`}>
            Delete article
          </ConfirmSubmitButton>
        </form>
      )}
    </div>
  );
}
