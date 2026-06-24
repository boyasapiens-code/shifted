import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, Container, buttonClass } from "@/components/ui";
import { requireEmployer } from "@/lib/auth";
import { confirmPrompt, declinePrompt } from "./actions";

export const metadata: Metadata = { title: "Verify skills" };

export default async function VerifyPage() {
  const { supabase, user } = await requireEmployer("/employer/verify");

  const { data: employer } = await supabase
    .from("employer_profiles")
    .select("response_rate, prompts_responded, prompts_eligible")
    .eq("id", user.id)
    .single();

  const { data: prompts } = await supabase
    .from("verification_prompts")
    .select(
      "id, badge_type, created_at, skill:skills(name, is_gate), worker:candidate_profiles(full_name)",
    )
    .eq("employer_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const rate = employer?.response_rate;
  const ratePct = rate == null ? null : Math.round(rate * 100);

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <Link href="/employer" className="text-sm text-stone-500 hover:text-ink">
            ← Dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Verify skills</h1>
          <p className="mt-1 text-stone-500">
            Your team hit these milestones on their last shifts. One tap confirms
            a portable badge — or skip it. Takes seconds.
          </p>

          {/* Responsiveness */}
          <div className="mt-6 flex items-center justify-between rounded-[var(--radius-card)] border border-stone-200 bg-stone-50 p-4">
            <div>
              <p className="text-sm font-medium text-ink">Your responsiveness</p>
              <p className="text-xs text-stone-500">
                Replying (confirm or skip) keeps your employer score healthy.
                Ignoring prompts is the only thing that hurts it.
              </p>
            </div>
            <div className="text-right">
              {ratePct == null ? (
                <Badge tone="default">New</Badge>
              ) : (
                <Badge tone={ratePct >= 75 ? "green" : ratePct >= 50 ? "amber" : "red"}>
                  {ratePct}% responsive
                </Badge>
              )}
            </div>
          </div>

          {/* Prompt cards */}
          {prompts && prompts.length > 0 ? (
            <ul className="mt-6 space-y-3">
              {prompts.map((p) => {
                const w = Array.isArray(p.worker) ? p.worker[0] : p.worker;
                const s = Array.isArray(p.skill) ? p.skill[0] : p.skill;
                const name = w?.full_name ?? "Worker";
                const first = name.split(" ")[0];
                return (
                  <li key={p.id} className="rounded-[var(--radius-card)] border border-stone-200 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100 text-sm font-semibold text-stone-500">
                        {name.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{name}</p>
                        {p.badge_type && (
                          <span className="text-xs font-medium text-signal">{p.badge_type}</span>
                        )}
                      </div>
                    </div>
                    <p className="mt-3 text-[15px] text-ink">
                      Did {first} demonstrate <strong>{s?.name}</strong> this shift?
                      {s?.is_gate && (
                        <span className="ml-1 rounded-sm bg-warning/20 px-1 text-[10px] font-semibold text-[#9a6b00]">
                          COMPLIANCE GATE
                        </span>
                      )}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <form action={confirmPrompt.bind(null, p.id)}>
                        <button className={buttonClass("primary", "md")}>✓ Confirm</button>
                      </form>
                      <form action={declinePrompt.bind(null, p.id)}>
                        <button className={buttonClass("outline", "md")}>Not this time</button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-6 rounded-[var(--radius-card)] border border-dashed border-stone-300 p-10 text-center text-stone-500">
              <p className="font-medium text-ink">All caught up.</p>
              <p className="mt-1 text-sm">
                New prompts appear here when your team completes shifts.
              </p>
            </div>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
