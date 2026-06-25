import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, Container, buttonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { CATEGORY_LABEL, FORMAT_LABEL, type Question } from "@/lib/interview";
import { approveQuestion, rejectQuestion } from "../actions";

export const metadata: Metadata = { title: "Question review" };

export default async function AdminQuestionsPage() {
  const { supabase } = await requireAdmin("/admin/questions");
  const { data } = await supabase
    .from("questions")
    .select("*")
    .eq("status", "pending_review")
    .order("created_at", { ascending: false });
  const rows = (data as Question[] | null) ?? [];

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-3xl py-12">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">Admin · Question bank</p>
            <a href="/admin/verifications" className="text-sm font-medium text-signal hover:underline">
              Verifications →
            </a>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Suggested questions</h1>
          <p className="mt-1 text-stone-500">
            Employer-suggested questions. Approve to add to the global bank (curated,
            discrimination-safe), or reject. {rows.length} pending.
          </p>

          {rows.length === 0 ? (
            <p className="mt-8 rounded-[var(--radius-card)] border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
              Nothing to review.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {rows.map((q) => (
                <div key={q.id} className="rounded-[var(--radius-card)] border border-stone-200 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{CATEGORY_LABEL[q.category]}</Badge>
                    <span className="text-xs text-stone-400">{FORMAT_LABEL[q.answer_format]}</span>
                    <span className="text-xs text-stone-400">· roles: {q.role_scope.join(", ")}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-ink">{q.prompt}</p>
                  <p className="mt-1 text-xs text-stone-400">
                    Note: approving adds it as-is; set answer options before it can be used in a set.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <form action={approveQuestion.bind(null, q.id)}>
                      <button className={buttonClass("primary", "sm")} type="submit">Approve</button>
                    </form>
                    <form action={rejectQuestion.bind(null, q.id)}>
                      <button className={buttonClass("ghost", "sm")} type="submit">Reject</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
