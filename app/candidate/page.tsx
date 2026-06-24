import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, ButtonLink, Container } from "@/components/ui";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { requireRole } from "@/lib/auth";
import { APPLICATION_STATUS_LABEL } from "@/lib/constants";

export const metadata: Metadata = { title: "Your dashboard" };

export default async function CandidateDashboard({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const { supabase, user, profile } = await requireRole("candidate", "/candidate");

  const { data: candidate } = await supabase
    .from("candidate_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: applications } = await supabase
    .from("applications")
    .select(
      "id, status, created_at, job:jobs(id, title, employer:employer_profiles(company_name, verification))",
    )
    .eq("candidate_id", user.id)
    .order("created_at", { ascending: false });

  // Lightweight profile completeness signal.
  const checks = [
    !!profile.full_name,
    !!candidate?.headline,
    !!candidate?.location,
    (candidate?.skills?.length ?? 0) > 0,
    (candidate?.languages?.length ?? 0) > 0,
  ];
  const complete = Math.round(
    (checks.filter(Boolean).length / checks.length) * 100,
  );

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="py-12">
          {saved && (
            <p className="mb-6 rounded-[var(--radius-base)] bg-stone-100 px-3 py-2 text-sm text-ink">
              Profile saved.
            </p>
          )}
          <p className="eyebrow">Candidate</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {profile.full_name ? `Hi, ${profile.full_name.split(" ")[0]}` : "Your dashboard"}
          </h1>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {/* Profile card */}
            <section className="rounded-[var(--radius-base)] border border-stone-200 p-6">
              <div className="mb-4 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.avatar_url ?? "/avatar-placeholder.svg"}
                  alt=""
                  className="h-12 w-12 rounded-full border border-stone-200 bg-stone-100 object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">
                    {profile.full_name ?? "Your profile"}
                  </p>
                  <p className="truncate text-sm text-stone-500">
                    {candidate?.location ?? "Add your location"}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Profile</h2>
                <span className="text-sm text-stone-500">{complete}% complete</span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full bg-ink transition-all"
                  style={{ width: `${complete}%` }}
                />
              </div>
              <p className="mt-4 text-sm text-stone-600">
                {candidate?.headline || "Add a headline so employers know your craft."}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {candidate?.open_to_work && <Badge>Open to work</Badge>}
                {candidate?.location && <Badge>{candidate.location}</Badge>}
              </div>
              <ButtonLink
                href="/candidate/profile"
                variant="outline"
                size="sm"
                className="mt-5 w-full"
              >
                Edit profile
              </ButtonLink>
            </section>

            {/* Applications */}
            <section className="rounded-[var(--radius-base)] border border-stone-200 p-6 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Applications</h2>
                <Link href="/jobs" className="text-sm font-medium text-ink underline">
                  Browse jobs
                </Link>
              </div>

              {applications && applications.length > 0 ? (
                <ul className="mt-4 divide-y divide-stone-100">
                  {applications.map((app) => {
                    // Supabase returns joined relations as arrays or objects.
                    const job = Array.isArray(app.job) ? app.job[0] : app.job;
                    const employer = job
                      ? Array.isArray(job.employer)
                        ? job.employer[0]
                        : job.employer
                      : null;
                    return (
                      <li
                        key={app.id}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0">
                          <Link
                            href={job ? `/jobs/${job.id}` : "#"}
                            className="font-medium text-ink hover:underline"
                          >
                            {job?.title ?? "Role"}
                          </Link>
                          <p className="flex items-center gap-1 text-sm text-stone-500">
                            {employer?.company_name}
                            {employer && (
                              <VerifiedBadge status={employer.verification} />
                            )}
                          </p>
                        </div>
                        <Badge>
                          {APPLICATION_STATUS_LABEL[
                            app.status as keyof typeof APPLICATION_STATUS_LABEL
                          ] ?? app.status}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="mt-4 rounded-[var(--radius-base)] border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
                  No applications yet.{" "}
                  <Link href="/jobs" className="underline">
                    Find your next shift
                  </Link>
                  .
                </div>
              )}
            </section>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
