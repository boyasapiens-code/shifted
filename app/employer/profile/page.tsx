import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, Field, Input, Select, Textarea, buttonClass } from "@/components/ui";
import { Uploader } from "@/components/Uploader";
import { requireEmployer } from "@/lib/auth";
import { INDUSTRIES } from "@/lib/constants";
import { updateEmployerProfile } from "../actions";
import {
  saveLogo,
  saveCover,
  addCompanyPhoto,
  removeCompanyPhoto,
} from "@/app/upload/actions";

export const metadata: Metadata = { title: "Company profile" };

export default async function EmployerProfilePage() {
  const { supabase, user } = await requireEmployer("/employer/profile");

  const { data: e } = await supabase
    .from("employer_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <p className="eyebrow">Employer</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Company profile
          </h1>
          <p className="mt-1 text-stone-500">
            Candidates choose companies they can trust. Be transparent.
          </p>

          {/* Media — auto-saves on upload */}
          <section className="mt-8 space-y-6 rounded-[var(--radius-base)] border border-stone-200 p-6">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={e?.logo_url ?? "/avatar-placeholder.svg"}
                alt=""
                className="h-16 w-16 shrink-0 rounded-[var(--radius-base)] border border-stone-200 bg-stone-100 object-cover"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">Company logo</p>
                <div className="mt-2 max-w-xs">
                  <Uploader
                    userId={user.id}
                    bucket="company"
                    isPublic
                    accept="image/*"
                    label="Upload logo"
                    onPersist={saveLogo}
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-ink">Cover image</p>
              {e?.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={e.cover_url}
                  alt=""
                  className="mt-2 h-32 w-full rounded-[var(--radius-base)] border border-stone-200 object-cover"
                />
              )}
              <div className="mt-2 max-w-xs">
                <Uploader
                  userId={user.id}
                  bucket="company"
                  isPublic
                  accept="image/*"
                  label={e?.cover_url ? "Replace cover" : "Upload cover"}
                  onPersist={saveCover}
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-ink">Workplace photos</p>
              <p className="mb-2 text-xs text-stone-500">
                Real photos of the space build trust — and count toward verification.
              </p>
              {(e?.photos?.length ?? 0) > 0 && (
                <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {e!.photos.map((url: string) => (
                    <div key={url} className="group relative aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full rounded-[var(--radius-base)] border border-stone-200 object-cover"
                      />
                      <form
                        action={removeCompanyPhoto.bind(null, url)}
                        className="absolute right-1 top-1"
                      >
                        <button
                          type="submit"
                          aria-label="Remove photo"
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/80 text-xs text-paper opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
              <div className="max-w-xs">
                <Uploader
                  userId={user.id}
                  bucket="company"
                  isPublic
                  accept="image/*"
                  multiple
                  label="Add photos"
                  onPersist={addCompanyPhoto}
                />
              </div>
            </div>
          </section>

          <form action={updateEmployerProfile} className="mt-8 space-y-5">
            <Field label="Company name">
              <Input name="company_name" defaultValue={e?.company_name ?? ""} required />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Industry">
                <Select name="industry" defaultValue={e?.industry ?? "other"}>
                  {INDUSTRIES.map((i) => (
                    <option key={i.value} value={i.value}>
                      {i.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Location">
                <Input name="location" defaultValue={e?.location ?? ""} placeholder="Bangkok" />
              </Field>
            </div>

            <Field label="About the company">
              <Textarea
                name="description"
                defaultValue={e?.description ?? ""}
                placeholder="What you do, your vibe, what it's like to work here."
              />
            </Field>

            <Field label="Website or social" hint="Helps with verification">
              <Input
                name="website"
                defaultValue={e?.website ?? ""}
                placeholder="https://"
              />
            </Field>

            <fieldset className="space-y-2 rounded-[var(--radius-base)] border border-stone-200 p-4">
              <legend className="px-1 text-sm font-medium text-ink">
                Vetting signals
              </legend>
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  name="business_registered"
                  defaultChecked={e?.business_registered ?? false}
                  className="h-4 w-4 accent-[var(--color-ink)]"
                />
                Business is registered
              </label>
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  name="salary_transparency"
                  defaultChecked={e?.salary_transparency ?? false}
                  className="h-4 w-4 accent-[var(--color-ink)]"
                />
                We commit to salary transparency
              </label>
            </fieldset>

            <div className="pt-2">
              <button type="submit" className={buttonClass("primary", "lg")}>
                Save company profile
              </button>
            </div>
          </form>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
