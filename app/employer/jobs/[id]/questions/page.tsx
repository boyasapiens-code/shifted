import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, Badge, buttonClass } from "@/components/ui";
import { requireEmployer } from "@/lib/auth";
import {
  CATEGORY_ORDER,
  CATEGORY_LABEL,
  FORMAT_LABEL,
  MIN_QUESTIONS,
  MAX_QUESTIONS,
  MAX_REQUIRED,
  isScorable,
  type Question,
  type QuestionCategory,
  type RoleTemplate,
} from "@/lib/interview";
import { saveQuestionSet, requestQuestion } from "./actions";

export const metadata: Metadata = { title: "Screening questions" };

// Map deriveRole-style keys → seeded role-template keys.
const ROLE_GUESS: Record<string, string> = {
  barista: "barista", bartender: "bartender", server: "server",
  retail: "retail_sales", cashier: "retail_sales", manager: "store_manager",
  supervisor: "store_manager",
};

export default async function QuestionBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ role?: string; saved?: string; error?: string; requested?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, user } = await requireEmployer(`/employer/jobs/${id}/questions`);

  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, employer_id")
    .eq("id", id)
    .maybeSingle();
  if (!job || job.employer_id !== user.id) notFound();

  const { data: templates } = await supabase
    .from("role_templates")
    .select("*")
    .order("sort");
  const roleTemplates = (templates as RoleTemplate[] | null) ?? [];

  const titleGuess = Object.keys(ROLE_GUESS).find((k) => job.title.toLowerCase().includes(k));
  const role = sp.role || (titleGuess ? ROLE_GUESS[titleGuess] : roleTemplates[0]?.key) || "barista";

  const { data: qs } = await supabase
    .from("questions")
    .select("*")
    .eq("status", "active")
    .overlaps("role_scope", ["all", role])
    .order("category");
  const questions = (qs as Question[] | null) ?? [];

  const { data: existing } = await supabase
    .from("question_sets")
    .select("*")
    .eq("job_id", id)
    .maybeSingle();
  const selected = new Set<string>(existing?.question_ids ?? []);
  const requiredSet = new Set<string>(existing?.required_ids ?? []);

  const byCategory = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: questions.filter((q) => q.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <Link href={`/employer/jobs/${id}`} className="text-sm text-stone-500 hover:text-ink">
            ← Back to job
          </Link>
          <p className="eyebrow mt-3">Screening questions</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{job.title}</h1>
          <p className="mt-1 text-stone-500">
            Pick {MIN_QUESTIONS}–{MAX_QUESTIONS} questions from the bank. Mark up to{" "}
            {MAX_REQUIRED} as required (knockouts). Questions are curated by SHIFTED —
            fair, consistent, and discrimination-safe.
          </p>

          {sp.saved && (
            <p className="mt-4 rounded-[var(--radius-base)] bg-success/10 px-3 py-2 text-sm text-success">
              Question set saved. Applicants will answer these.
            </p>
          )}
          {sp.requested && (
            <p className="mt-4 rounded-[var(--radius-base)] bg-stone-100 px-3 py-2 text-sm text-ink">
              Thanks — your suggestion is in SHIFTED&apos;s review queue.
            </p>
          )}
          {sp.error === "count" && (
            <p className="mt-4 rounded-[var(--radius-base)] bg-danger/10 px-3 py-2 text-sm text-danger">
              Pick between {MIN_QUESTIONS} and {MAX_QUESTIONS} questions.
            </p>
          )}
          {sp.error === "required" && (
            <p className="mt-4 rounded-[var(--radius-base)] bg-danger/10 px-3 py-2 text-sm text-danger">
              At most {MAX_REQUIRED} questions can be required.
            </p>
          )}

          {/* Role selector */}
          <form method="get" className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-stone-500">Question bank for:</span>
            {roleTemplates.map((t) => (
              <button
                key={t.key}
                name="role"
                value={t.key}
                className={
                  "rounded-full px-3 py-1 text-xs font-medium " +
                  (role === t.key ? "bg-ink text-paper" : "border border-stone-200 text-stone-600 hover:text-ink")
                }
              >
                {t.name}
              </button>
            ))}
          </form>

          {/* The set builder */}
          <form action={saveQuestionSet.bind(null, id)} className="mt-6">
            <div className="space-y-6">
              {byCategory.map((group) => (
                <section key={group.cat}>
                  <p className="eyebrow mb-2">{CATEGORY_LABEL[group.cat as QuestionCategory]}</p>
                  <div className="space-y-2">
                    {group.items.map((q) => (
                      <div key={q.id} className="rounded-[var(--radius-card)] border border-stone-200 p-4">
                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            name="include"
                            value={q.id}
                            defaultChecked={selected.has(q.id)}
                            className="mt-1 h-4 w-4 accent-[var(--color-signal)]"
                          />
                          <span className="flex-1">
                            <span className="text-sm font-medium text-ink">{q.prompt}</span>
                            <span className="mt-0.5 block text-xs text-stone-400">
                              {FORMAT_LABEL[q.answer_format]}
                            </span>
                          </span>
                        </label>
                        {isScorable(q) && (
                          <label className="mt-2 ml-7 flex items-center gap-2 text-xs text-stone-500">
                            <input
                              type="checkbox"
                              name="required"
                              value={q.id}
                              defaultChecked={requiredSet.has(q.id)}
                              className="h-3.5 w-3.5 accent-[var(--color-signal)]"
                            />
                            Required (knockout)
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="sticky bottom-4 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-stone-200 bg-paper/90 p-4 backdrop-blur">
              <label className="flex items-center gap-2 text-sm text-stone-600">
                Scoring:
                <select
                  name="scoring_mode"
                  defaultValue={existing?.scoring_mode ?? "attach"}
                  className="rounded-[var(--radius-base)] border border-stone-200 px-2 py-1.5 text-sm"
                >
                  <option value="attach">Attach answers</option>
                  <option value="rank">Score &amp; rank</option>
                  <option value="none">Don&apos;t score</option>
                </select>
              </label>
              <button className={buttonClass("primary", "md")} type="submit">
                Save question set
              </button>
            </div>
          </form>

          {/* Request a question */}
          <details className="mt-10 rounded-[var(--radius-card)] border border-stone-200 p-5">
            <summary className="cursor-pointer text-sm font-medium text-ink">
              Can&apos;t find a question? Suggest one
            </summary>
            <form action={requestQuestion.bind(null, id)} className="mt-4 space-y-3">
              <input type="hidden" name="role" value={role} />
              <textarea
                name="prompt"
                required
                rows={2}
                placeholder="Your question (about the candidate, never about other people)…"
                className="w-full rounded-[var(--radius-base)] border border-stone-200 p-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <select name="category" className="rounded-[var(--radius-base)] border border-stone-200 px-2 py-1.5 text-sm" defaultValue="skills">
                  {CATEGORY_ORDER.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                  ))}
                </select>
                <select name="answer_format" className="rounded-[var(--radius-base)] border border-stone-200 px-2 py-1.5 text-sm" defaultValue="single_select">
                  <option value="single_select">Multiple choice</option>
                  <option value="yes_no">Yes / No</option>
                  <option value="scale">Scale 1–5</option>
                  <option value="short_structured">Short answer</option>
                </select>
                <button className={buttonClass("outline", "sm")} type="submit">Suggest</button>
              </div>
              <p className="text-xs text-stone-400">
                SHIFTED reviews every suggestion. Approved questions join the bank for everyone.
              </p>
            </form>
          </details>

          <p className="mt-6 text-xs text-stone-400">
            <Badge tone="amber">Note</Badge> Min 3, max 8 questions — short sets protect
            apply rates. Workers are the scarce side.
          </p>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
