import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, Field, Input, Select, Textarea, buttonClass } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { EMPLOYMENT_TYPES, INDUSTRIES } from "@/lib/constants";
import { createJob } from "../../actions";

export const metadata: Metadata = { title: "Post a job" };

export default async function NewJobPage() {
  const { data: employer } = await requireRole("employer", "/employer/jobs/new").then(
    async ({ supabase, user }) => ({
      data: (
        await supabase
          .from("employer_profiles")
          .select("industry")
          .eq("id", user.id)
          .single()
      ).data,
    }),
  );

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <p className="eyebrow">Employer</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Post a job</h1>
          <p className="mt-1 text-stone-500">
            Be clear and honest. Transparent listings get better applicants.
          </p>

          <form action={createJob} className="mt-8 space-y-5">
            <Field label="Job title">
              <Input name="title" required placeholder="e.g. Head Barista" />
            </Field>

            <Field label="Description">
              <Textarea
                name="description"
                className="min-h-40"
                placeholder="The role, the team, the shifts, what success looks like."
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Industry">
                <Select name="industry" defaultValue={employer?.industry ?? "other"}>
                  {INDUSTRIES.map((i) => (
                    <option key={i.value} value={i.value}>
                      {i.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Employment type">
                <Select name="employment_type" defaultValue="full_time">
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Location">
                <Input name="location" placeholder="Bangkok" />
              </Field>
              <Field label="Experience required (years)">
                <Input name="experience_required" type="number" min={0} defaultValue={0} />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Salary min (฿)">
                <Input name="salary_min" type="number" min={0} step={500} />
              </Field>
              <Field label="Salary max (฿)">
                <Input name="salary_max" type="number" min={0} step={500} />
              </Field>
              <Field label="Per">
                <Select name="salary_period" defaultValue="month">
                  <option value="hour">Hour</option>
                  <option value="day">Day</option>
                  <option value="month">Month</option>
                </Select>
              </Field>
            </div>

            <Field
              label="Languages required"
              hint="Comma-separated — e.g. Thai, English"
            >
              <Input name="languages_required" />
            </Field>

            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                name="shift_work"
                className="h-4 w-4 accent-[var(--color-ink)]"
              />
              This role involves shift work
            </label>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                name="publish"
                value="1"
                className={buttonClass("primary", "lg")}
              >
                Publish job
              </button>
              <button
                type="submit"
                name="publish"
                value="0"
                className={buttonClass("outline", "lg")}
              >
                Save as draft
              </button>
            </div>
          </form>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
