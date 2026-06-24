import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, Field, Input, Textarea, buttonClass } from "@/components/ui";
import { Uploader } from "@/components/Uploader";
import { requireRole } from "@/lib/auth";
import { updateCandidateProfile } from "../actions";
import {
  saveAvatar,
  saveResume,
  addPortfolio,
  removePortfolio,
} from "@/app/upload/actions";

export const metadata: Metadata = { title: "Edit profile" };

export default async function CandidateProfilePage() {
  const { supabase, user, profile } = await requireRole(
    "candidate",
    "/candidate/profile",
  );

  const { data: c } = await supabase
    .from("candidate_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Owner-only signed URL so the candidate can preview their private résumé.
  let resumeUrl: string | null = null;
  if (c?.resume_url) {
    const { data: signed } = await supabase.storage
      .from("resumes")
      .createSignedUrl(c.resume_url, 3600);
    resumeUrl = signed?.signedUrl ?? null;
  }

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <p className="eyebrow">Candidate</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Your profile
          </h1>
          <p className="mt-1 text-stone-500">
            A complete, honest profile gets you discovered faster. Reputation
            compounds.
          </p>

          {/* Media — auto-saves on upload, separate from the details form */}
          <section className="mt-8 space-y-6 rounded-[var(--radius-base)] border border-stone-200 p-6">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.avatar_url ?? "/avatar-placeholder.svg"}
                alt=""
                className="h-16 w-16 shrink-0 rounded-full border border-stone-200 bg-stone-100 object-cover"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">Profile photo</p>
                <div className="mt-2 max-w-xs">
                  <Uploader
                    userId={user.id}
                    bucket="avatars"
                    isPublic
                    accept="image/*"
                    label="Upload photo"
                    onPersist={saveAvatar}
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-ink">Résumé (PDF)</p>
              <p className="mb-2 text-xs text-stone-500">
                Private — only you can view it here. Secure sharing with employers
                comes with verification.
              </p>
              <div className="max-w-xs">
                <Uploader
                  userId={user.id}
                  bucket="resumes"
                  isPublic={false}
                  accept="application/pdf"
                  label={c?.resume_url ? "Replace résumé" : "Upload résumé"}
                  onPersist={saveResume}
                />
              </div>
              {resumeUrl && (
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-ink underline"
                >
                  View current résumé
                </a>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-ink">Portfolio</p>
              <p className="mb-2 text-xs text-stone-500">
                Show your work — latte art, plating, the room, the vibe.
              </p>
              {(c?.portfolio_urls?.length ?? 0) > 0 && (
                <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {c!.portfolio_urls.map((url: string) => (
                    <div key={url} className="group relative aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full rounded-[var(--radius-base)] border border-stone-200 object-cover"
                      />
                      <form
                        action={removePortfolio.bind(null, url)}
                        className="absolute right-1 top-1"
                      >
                        <button
                          type="submit"
                          aria-label="Remove image"
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
                  bucket="portfolio"
                  isPublic
                  accept="image/*"
                  multiple
                  label="Add images"
                  onPersist={addPortfolio}
                />
              </div>
            </div>
          </section>

          <form action={updateCandidateProfile} className="mt-8 space-y-5">
            <Field label="Full name">
              <Input name="full_name" defaultValue={profile.full_name ?? ""} required />
            </Field>
            <Field label="Headline" hint="e.g. Specialty barista · 3 years · Bangkok">
              <Input name="headline" defaultValue={c?.headline ?? ""} />
            </Field>
            <Field label="About you">
              <Textarea name="bio" defaultValue={c?.bio ?? ""} />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Location">
                <Input name="location" defaultValue={c?.location ?? ""} placeholder="Bangkok" />
              </Field>
              <Field label="Phone">
                <Input name="phone" defaultValue={c?.phone ?? ""} />
              </Field>
              <Field label="Years of experience">
                <Input
                  name="years_experience"
                  type="number"
                  min={0}
                  defaultValue={c?.years_experience ?? 0}
                />
              </Field>
              <Field label="Availability" hint="e.g. Immediate, 2 weeks notice">
                <Input name="availability" defaultValue={c?.availability ?? ""} />
              </Field>
            </div>

            <Field label="Skills" hint="Comma-separated — e.g. Latte art, POS, Inventory">
              <Input name="skills" defaultValue={(c?.skills ?? []).join(", ")} />
            </Field>
            <Field label="Languages" hint="Comma-separated — e.g. Thai, English">
              <Input name="languages" defaultValue={(c?.languages ?? []).join(", ")} />
            </Field>

            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                name="open_to_work"
                defaultChecked={c?.open_to_work ?? true}
                className="h-4 w-4 accent-[var(--color-ink)]"
              />
              I&apos;m open to work
            </label>

            <div className="pt-2">
              <button type="submit" className={buttonClass("primary", "lg")}>
                Save profile
              </button>
            </div>
          </form>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
