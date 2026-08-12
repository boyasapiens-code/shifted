import { Field, Input, Select, Textarea, buttonClass } from "@/components/ui";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { linesFromSocials } from "@/lib/admin-content-format";
import { SPOTLIGHT_CATEGORIES, type SpotlightRow } from "@/lib/marketing-content";

export function SpotlightForm({
  initial,
  employers,
  action,
  deleteAction,
  errorMessage,
}: {
  initial: SpotlightRow | null;
  employers: { id: string; company_name: string }[];
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
        <Field label="Slug" hint="URL segment, e.g. stash-bkk">
          <Input name="slug" required defaultValue={initial?.slug} />
        </Field>
        <Field label="Business name">
          <Input name="business_name" required defaultValue={initial?.business_name} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Category">
            <Select name="category" defaultValue={initial?.category ?? SPOTLIGHT_CATEGORIES[0].value}>
              {SPOTLIGHT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Area">
            <Input name="area" defaultValue={initial?.area} placeholder="e.g. Ekkamai, Bangkok" />
          </Field>
          <Field label="Founded year">
            <Input type="number" name="founded_year" min={1900} defaultValue={initial?.founded_year ?? ""} />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Logo" hint="Image URL, optional">
            <Input name="logo" defaultValue={initial?.logo ?? ""} />
          </Field>
          <Field label="Hero image" hint="Image URL, optional">
            <Input name="hero_image" defaultValue={initial?.hero_image ?? ""} />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Website" hint="Optional">
            <Input name="website" defaultValue={initial?.website ?? ""} />
          </Field>
          <Field label="Linked SHIFTED employer" hint="Shows their live job openings on the spotlight">
            <Select name="shifted_employer_id" defaultValue={initial?.shifted_employer_id ?? ""}>
              <option value="">— None —</option>
              {employers.map((e) => (
                <option key={e.id} value={e.id}>{e.company_name}</option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Socials" hint='One per line: "Label | https://url"'>
          <Textarea name="socials" defaultValue={linesFromSocials(initial?.socials)} className="min-h-16 font-mono text-xs" />
        </Field>

        <Field label="Published date">
          <Input type="date" name="published_at" defaultValue={initial?.published_at ?? ""} />
        </Field>

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

        <div className="border-t border-stone-200 pt-5">
          <p className="eyebrow mb-3">Body (Markdown)</p>
          <div className="space-y-5">
            <Field label="The story">
              <Textarea name="section_story" defaultValue={initial?.section_story} className="min-h-32 font-mono text-xs" />
            </Field>
            <Field label="The culture">
              <Textarea name="section_culture" defaultValue={initial?.section_culture} className="min-h-32 font-mono text-xs" />
            </Field>
            <Field label="What they're known for">
              <Textarea name="section_known_for" defaultValue={initial?.section_known_for} className="min-h-24 font-mono text-xs" />
            </Field>
          </div>
        </div>

        <div className="border-t border-stone-200 pt-5">
          <p className="eyebrow mb-3">SEO (optional — falls back to business name/category)</p>
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
          <ConfirmSubmitButton confirmMessage={`Delete "${initial?.business_name ?? initial?.slug}"? This can't be undone.`}>
            Delete spotlight
          </ConfirmSubmitButton>
        </form>
      )}
    </div>
  );
}
