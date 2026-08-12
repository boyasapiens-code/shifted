import { Field, Input, Select, Textarea, buttonClass } from "@/components/ui";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { IDEA_CATEGORIES, type IdeaRow } from "@/lib/marketing-content";

export function IdeaForm({
  initial,
  action,
  deleteAction,
  errorMessage,
}: {
  initial: IdeaRow | null;
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

      <form action={action} className="space-y-5">
        <Field label="Slug" hint="URL segment, e.g. job-post-people-apply-to">
          <Input name="slug" required defaultValue={initial?.slug} />
        </Field>
        <Field label="Title">
          <Input name="title" required defaultValue={initial?.title} />
        </Field>
        <Field label="Excerpt">
          <Textarea name="excerpt" defaultValue={initial?.excerpt} className="min-h-20" />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category">
            <Select name="category" defaultValue={initial?.category ?? IDEA_CATEGORIES[0]}>
              {IDEA_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="CTA type">
            <Select name="cta_type" defaultValue={initial?.cta_type ?? "solutions"}>
              <option value="solutions">Marketing solutions</option>
              <option value="shifted-hire">Hire on SHIFTED</option>
              <option value="booyah">Booyah</option>
            </Select>
          </Field>
        </div>

        <Field label="Cover image" hint="Image URL, optional">
          <Input name="cover_image" defaultValue={initial?.cover_image ?? ""} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Author name">
            <Input name="author_name" defaultValue={initial?.author_name ?? "SHIFTED"} />
          </Field>
          <Field label="Author role">
            <Input name="author_role" defaultValue={initial?.author_role ?? "Operators"} />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Read time (minutes)" hint="Leave blank to estimate from body length">
            <Input type="number" name="read_time" min={1} defaultValue={initial?.read_time ?? ""} />
          </Field>
          <Field label="Published date">
            <Input type="date" name="published_at" defaultValue={initial?.published_at ?? ""} />
          </Field>
        </div>

        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="published"
              defaultChecked={initial?.published ?? false}
              className="h-4 w-4 accent-[var(--color-ink)]"
            />
            Published (visible on the public site)
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={initial?.featured ?? false}
              className="h-4 w-4 accent-[var(--color-ink)]"
            />
            Featured
          </label>
        </div>

        <Field label="Body (Markdown)">
          <Textarea name="body_markdown" defaultValue={initial?.body_markdown} className="min-h-64 font-mono text-xs" />
        </Field>

        <div className="border-t border-stone-200 pt-5">
          <p className="eyebrow mb-3">SEO (optional — falls back to title/excerpt)</p>
          <div className="space-y-5">
            <Field label="Meta title">
              <Input name="seo_meta_title" defaultValue={initial?.seo_meta_title ?? ""} />
            </Field>
            <Field label="Meta description">
              <Textarea name="seo_meta_description" defaultValue={initial?.seo_meta_description ?? ""} className="min-h-16" />
            </Field>
            <Field label="OG image URL">
              <Input name="seo_og_image" defaultValue={initial?.seo_og_image ?? ""} />
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
            Delete idea
          </ConfirmSubmitButton>
        </form>
      )}
    </div>
  );
}
