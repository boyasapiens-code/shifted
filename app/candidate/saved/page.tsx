import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { JobCard } from "@/components/JobCard";
import { Container } from "@/components/ui";
import { requireWorker } from "@/lib/auth";
import { getSavedJobs } from "@/lib/queries";
import { getDict, getLocale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Saved jobs" };

export default async function SavedJobsPage() {
  const { user } = await requireWorker("/candidate/saved");
  const [t, locale, jobs] = await Promise.all([getDict(), getLocale(), getSavedJobs(user.id)]);
  const savedIds = new Set(jobs.map((j) => j.id));

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="py-12">
          <p className="eyebrow">{t.nav.savedJobs}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t.savedJobsPage.title}</h1>

          {jobs.length > 0 ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  locale={locale}
                  t={t}
                  saved={savedIds.has(job.id)}
                  canSave
                />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-[var(--radius-card)] border border-dashed border-stone-300 p-10 text-center text-stone-500">
              {t.savedJobsPage.empty}
            </div>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
