import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, ButtonLink, Container, Input, Select, buttonClass } from "@/components/ui";
import { RatingSummary, ReliabilityBadge } from "@/components/Rating";
import { VerificationBadge } from "@/components/VerificationBadge";
import { createClient } from "@/lib/supabase/server";
import { getOpenCandidates } from "@/lib/queries";
import { VERIFICATION_LEVELS } from "@/lib/constants";

export const metadata: Metadata = { title: "Find talent" };

export default async function TalentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; minLevel?: string }>;
}) {
  const { q, minLevel } = await searchParams;
  const min = Number(minLevel) || 0;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const candidates = user ? await getOpenCandidates(q, min) : [];

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="py-12">
          <p className="eyebrow">Find talent</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Pre-screened candidates
          </h1>
          <p className="mt-1 text-stone-500">
            Open-to-work professionals across hospitality, retail &amp; lifestyle.
          </p>

          {!user ? (
            <div className="mt-8 rounded-[var(--radius-base)] border border-stone-200 bg-stone-50 p-8">
              <p className="font-medium text-ink">Sign in to browse talent.</p>
              <p className="mt-1 text-sm text-stone-600">
                Talent profiles are visible to verified employers.
              </p>
              <div className="mt-4 flex gap-2">
                <ButtonLink href="/login?next=/talent">Log in</ButtonLink>
                <ButtonLink href="/signup" variant="outline">
                  Create employer account
                </ButtonLink>
              </div>
            </div>
          ) : (
            <>
              <form className="mt-8 flex max-w-2xl flex-wrap gap-2">
                <Input
                  name="q"
                  defaultValue={q ?? ""}
                  placeholder="Search role or location"
                  className="min-w-48 flex-1"
                />
                <Select name="minLevel" defaultValue={String(min)} className="w-44">
                  <option value="0">Any verification</option>
                  {VERIFICATION_LEVELS.map((l) => (
                    <option key={l.level} value={l.level}>
                      Level {l.level}+ verified
                    </option>
                  ))}
                </Select>
                <button className={buttonClass("primary", "md")}>Search</button>
              </form>

              <p className="mt-8 text-sm text-stone-500">
                {candidates.length}{" "}
                {candidates.length === 1 ? "candidate" : "candidates"}
              </p>

              {candidates.length > 0 ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {candidates.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-[var(--radius-base)] border border-stone-200 p-5"
                    >
                      <p className="font-semibold text-ink">
                        {c.full_name || "Candidate"}
                      </p>
                      <p className="text-sm text-stone-500">
                        {c.headline ?? "—"}
                        {c.location ? ` · ${c.location}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <VerificationBadge level={c.verification_level} />
                        {c.rating_count > 0 && (
                          <RatingSummary avg={c.rating_avg} count={c.rating_count} />
                        )}
                        <ReliabilityBadge score={c.reliability_score} />
                      </div>
                      {c.skills.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {c.skills.slice(0, 5).map((s) => (
                            <Badge key={s}>{s}</Badge>
                          ))}
                        </div>
                      )}
                      <p className="mt-3 text-xs text-stone-400">
                        {c.years_experience} yrs experience
                        {c.languages.length ? ` · ${c.languages.join(", ")}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[var(--radius-base)] border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
                  No open candidates match yet.
                </div>
              )}
            </>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
