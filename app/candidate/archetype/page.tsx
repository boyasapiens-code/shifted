import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, ButtonLink, buttonClass } from "@/components/ui";
import { requireWorker } from "@/lib/auth";
import { ARCHETYPES, QUESTIONS, type ArchetypeKey } from "@/lib/archetypes";
import { saveArchetype } from "./actions";

export const metadata: Metadata = { title: "Find your archetype" };

export default async function ArchetypePage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string; error?: string }>;
}) {
  const { result, error } = await searchParams;
  const { supabase, user } = await requireWorker("/candidate/archetype");

  const { data: candidate } = await supabase
    .from("candidate_profiles")
    .select("archetype")
    .eq("id", user.id)
    .single();

  // Just finished → show the result.
  const resultKey = result && result in ARCHETYPES ? (result as ArchetypeKey) : null;
  if (resultKey) {
    const a = ARCHETYPES[resultKey];
    return (
      <>
        <SiteHeader />
        <main>
          <Container className="max-w-xl py-16 text-center">
            <p className="eyebrow">Your archetype</p>
            <h1 className="mt-3 text-5xl font-black tracking-tightest">{a.name}</h1>
            <p className="mt-2 text-lg text-signal">{a.tagline}</p>
            <p className="mt-5 text-stone-600">{a.blurb}</p>
            <p className="mt-6 text-sm text-stone-500">
              No archetype is better than another — this is about finding roles
              that fit how you work. People change; you can retake anytime.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <ButtonLink href="/candidate">Go to dashboard</ButtonLink>
              <ButtonLink href="/candidate/archetype" variant="outline">
                Retake
              </ButtonLink>
            </div>
          </Container>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <Link href="/candidate" className="text-sm text-stone-500 hover:text-ink">
            ← Dashboard
          </Link>
          <p className="eyebrow mt-3">Workforce archetype</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            How do you work on the floor?
          </h1>
          <p className="mt-1 text-stone-500">
            {QUESTIONS.length} quick questions — no right answers. We&apos;ll match
            you to the roles that fit how you actually work.
            {candidate?.archetype && (
              <>
                {" "}
                You&apos;re currently a{" "}
                <span className="font-medium text-ink">
                  {ARCHETYPES[candidate.archetype as ArchetypeKey]?.name}
                </span>
                .
              </>
            )}
          </p>

          {error === "incomplete" && (
            <p className="mt-4 rounded-[var(--radius-base)] bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Please answer every question.
            </p>
          )}

          <form action={saveArchetype} className="mt-8 space-y-6">
            {QUESTIONS.map((q, i) => (
              <fieldset key={i} className="rounded-[var(--radius-card)] border border-stone-200 p-5">
                <legend className="px-1 text-sm font-semibold text-ink">
                  {i + 1}. {q.prompt}
                </legend>
                <div className="mt-3 space-y-2">
                  {q.options.map((o, j) => (
                    <label
                      key={j}
                      className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-base)] px-2 py-1.5 text-sm text-stone-700 hover:bg-stone-50"
                    >
                      <input
                        type="radio"
                        name={`q${i}`}
                        value={o.archetype}
                        required
                        className="h-4 w-4 accent-[var(--color-ink)]"
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <button type="submit" className={buttonClass("primary", "lg", "w-full")}>
              See my archetype
            </button>
          </form>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
