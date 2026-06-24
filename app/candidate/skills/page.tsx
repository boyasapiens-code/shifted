import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, buttonClass } from "@/components/ui";
import { SkillChip } from "@/components/SkillChip";
import { requireWorker } from "@/lib/auth";
import type { Skill, WorkerSkill } from "@/lib/types";
import { claimSkill, unclaimSkill } from "./actions";

export const metadata: Metadata = { title: "Skills & badges" };

const TIER_LABEL = ["", "Foundations", "Core Craft", "Service & Sales", "Lead / Trainer"];

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role: roleParam } = await searchParams;
  const { supabase, user } = await requireWorker("/candidate/skills");

  // Available roles in the catalog.
  const { data: roleRows } = await supabase.from("skills").select("role");
  const roles = [...new Set((roleRows ?? []).map((r) => r.role))].sort();
  const role = roleParam && roles.includes(roleParam) ? roleParam : roles[0];

  const { data: skills } = await supabase
    .from("skills")
    .select("*")
    .eq("role", role ?? "")
    .order("tier", { ascending: true })
    .order("sort", { ascending: true })
    .returns<Skill[]>();

  const { data: mine } = await supabase
    .from("worker_skills")
    .select("skill_id, status")
    .eq("worker_id", user.id)
    .returns<Pick<WorkerSkill, "skill_id" | "status">[]>();
  const status = new Map((mine ?? []).map((m) => [m.skill_id, m.status]));

  const all = skills ?? [];
  const verified = all.filter((s) => status.get(s.id) === "employer_verified");
  const badges = verified.map((s) => s.badge_name).filter(Boolean) as string[];
  const tiers = [1, 2, 3, 4].map((t) => all.filter((s) => s.tier === t));

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <Link href="/candidate" className="text-sm text-stone-500 hover:text-ink">
            ← Dashboard
          </Link>
          <p className="eyebrow mt-3">Skills &amp; badges</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Prove what you can do
          </h1>
          <p className="mt-1 text-stone-500">
            Claim the skills you have. Employers verify them on the job — and
            employer-verified skills are the badges that move you to better roles.
          </p>

          {/* role selector */}
          {roles.length > 1 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {roles.map((r) => (
                <Link
                  key={r}
                  href={`/candidate/skills?role=${r}`}
                  className={`rounded-full border px-3 py-1 text-sm capitalize ${
                    r === role ? "border-ink bg-ink text-paper" : "border-stone-200 text-stone-600"
                  }`}
                >
                  {r}
                </Link>
              ))}
            </div>
          )}

          {/* progress + badges */}
          <div className="mt-6 rounded-[var(--radius-card)] border border-stone-200 bg-stone-50 p-5">
            <p className="text-sm font-medium text-ink">
              {verified.length} of {all.length} skills employer-verified
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full bg-signal transition-all"
                style={{ width: `${all.length ? (verified.length / all.length) * 100 : 0}%` }}
              />
            </div>
            {badges.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {badges.map((b) => (
                  <span key={b} className="rounded-full bg-signal/10 px-2.5 py-0.5 text-xs font-semibold text-signal">
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* tiers */}
          <div className="mt-8 space-y-6">
            {tiers.map((tierSkills, i) => {
              const tier = i + 1;
              if (tierSkills.length === 0) return null;
              return (
                <section key={tier}>
                  <h2 className="text-sm font-semibold text-ink">
                    Tier {tier} · {TIER_LABEL[tier]}
                  </h2>
                  <div className="mt-3 space-y-2">
                    {tierSkills.map((s) => {
                      const st = status.get(s.id);
                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between gap-3 rounded-[var(--radius-base)] border border-stone-200 px-3 py-2"
                        >
                          <SkillChip
                            name={s.name}
                            status={st ?? "self_declared"}
                            isGate={s.is_gate}
                          />
                          {st === "employer_verified" ? (
                            <span className="text-xs font-medium text-signal">✓ Verified</span>
                          ) : st === "self_declared" ? (
                            <form action={unclaimSkill.bind(null, s.id, role ?? "")}>
                              <button className="text-xs text-stone-400 hover:text-ink">Remove</button>
                            </form>
                          ) : (
                            <form action={claimSkill.bind(null, s.id, role ?? "")}>
                              <button className={buttonClass("outline", "sm")}>Claim</button>
                            </form>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          {all.length === 0 && (
            <p className="mt-8 rounded-[var(--radius-base)] border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
              No skill stack published for this role yet.
            </p>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
