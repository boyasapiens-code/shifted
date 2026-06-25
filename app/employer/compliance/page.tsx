import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, Container, buttonClass } from "@/components/ui";
import { ComplianceBadge } from "@/components/ComplianceBadge";
import { requireEmployer } from "@/lib/auth";
import {
  COMPLIANCE_GROUPS,
  COMPLIANCE_CALENDAR,
  COMPLIANCE_RATES,
  COMPLIANCE_VERIFIED_ON,
  PER_HIRE_CHECKLIST,
  applicableGroups,
  complianceScore,
  complianceStatus,
} from "@/lib/compliance";
import type { EmployerProfile } from "@/lib/types";
import { saveCompliance } from "./actions";

export const metadata: Metadata = {
  title: "Compliance Center — hiring the right way in Thailand",
};

const SCOPE_TONE: Record<string, "amber" | "blue" | undefined> = {
  scale: "amber",
  foreign: "blue",
};
const SCOPE_LABEL: Record<string, string> = {
  scale: "10+ staff",
  foreign: "Foreign hires",
};

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const { supabase, user } = await requireEmployer("/employer/compliance");

  const { data } = await supabase
    .from("employer_profiles")
    .select("*")
    .eq("id", user.id)
    .single<EmployerProfile>();
  const employer = data!;

  const done = new Set(employer.compliance_items ?? []);
  const ctx = {
    foreignHires: employer.compliance_foreign_hires,
    headcount10Plus: employer.compliance_headcount_10plus,
  };
  const score = complianceScore(employer.compliance_items ?? [], ctx);
  const status = complianceStatus(employer.compliance_items ?? [], ctx);
  const groups = applicableGroups(ctx);

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-3xl py-12">
          {saved && (
            <p className="mb-6 rounded-[var(--radius-base)] bg-stone-100 px-3 py-2 text-sm text-ink">
              Compliance self-attestation saved.
            </p>
          )}

          <p className="eyebrow">Compliance Center</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Hiring the right way in Thailand
          </h1>
          <p className="mt-2 max-w-2xl text-stone-600">
            The full document trail — RD, SSO, DLPW, and (for foreign hires) DOE
            and Immigration. Work through it, self-attest what you meet, and earn a
            trust badge that workers can see.
          </p>

          {/* Score + badge */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-card)] border border-stone-200 bg-stone-50 p-5">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-ink">Your compliance</p>
                <ComplianceBadge status={status} />
                {status !== "ready" && (
                  <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-600">
                    {status === "in_progress" ? "In progress" : "Not started"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-stone-600">
                {score.done} of {score.total} applicable items attested.
                {status === "ready"
                  ? " You qualify for the Compliance-ready badge."
                  : " Complete every applicable item to earn the badge."}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black tracking-tightest text-ink">{score.pct}%</div>
              <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-stone-200">
                <div className="h-full rounded-full bg-success" style={{ width: `${score.pct}%` }} />
              </div>
            </div>
          </div>

          <form action={saveCompliance} className="mt-8">
            {/* Context toggles decide which groups apply */}
            <fieldset className="rounded-[var(--radius-card)] border border-stone-200 p-5">
              <legend className="px-1 text-sm font-medium text-ink">Your situation</legend>
              <label className="flex items-start gap-3 py-1.5">
                <input
                  type="checkbox"
                  name="headcount_10plus"
                  defaultChecked={employer.compliance_headcount_10plus}
                  className="mt-1 h-4 w-4 accent-[var(--color-signal)]"
                />
                <span className="text-sm text-stone-700">
                  We have <strong>10 or more</strong> regular employees
                  <span className="block text-xs text-stone-500">
                    Unlocks work-rules, employee register & EWF obligations.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 py-1.5">
                <input
                  type="checkbox"
                  name="foreign_hires"
                  defaultChecked={employer.compliance_foreign_hires}
                  className="mt-1 h-4 w-4 accent-[var(--color-signal)]"
                />
                <span className="text-sm text-stone-700">
                  We employ <strong>foreign nationals</strong>
                  <span className="block text-xs text-stone-500">
                    Adds work-permit (DOE) and visa (Immigration) items.
                  </span>
                </span>
              </label>
              <p className="mt-2 text-xs text-stone-400">
                Changing these and saving updates which items count toward your score.
              </p>
            </fieldset>

            {/* Checklist, grouped by agency */}
            <div className="mt-6 space-y-6">
              {groups.map((group) => (
                <section
                  key={group.id}
                  className="rounded-[var(--radius-card)] border border-stone-200 p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight">{group.title}</h2>
                    {group.scope !== "core" && (
                      <Badge tone={SCOPE_TONE[group.scope]}>{SCOPE_LABEL[group.scope]}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-stone-500">
                    {group.agency} · {group.agencyTh}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">{group.blurb}</p>

                  <ul className="mt-4 space-y-3">
                    {group.items.map((item) => (
                      <li key={item.key}>
                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            name={`item:${item.key}`}
                            defaultChecked={done.has(item.key)}
                            className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-signal)]"
                          />
                          <span>
                            <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                              {item.label}
                              {item.deadline && (
                                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-normal text-stone-500">
                                  {item.deadline}
                                </span>
                              )}
                            </span>
                            <span className="mt-0.5 block text-xs text-stone-500">
                              {item.detail}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <div className="sticky bottom-4 mt-6 flex items-center justify-between gap-4 rounded-[var(--radius-card)] border border-stone-200 bg-paper/90 p-4 backdrop-blur">
              <p className="text-sm text-stone-500">
                Self-attested — confirm you meet each item before ticking it.
              </p>
              <button className={buttonClass("primary", "md")} type="submit">
                Save attestation
              </button>
            </div>
          </form>

          {/* Per-hire checklist */}
          <h2 className="mt-14 text-xl font-semibold tracking-tight">
            Per-hire checklist
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            The document trail for each new employee — a reusable template.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {PER_HIRE_CHECKLIST.map((phase) => (
              <div
                key={phase.phase}
                className="rounded-[var(--radius-card)] border border-stone-200 p-5"
              >
                <p className="eyebrow mb-2">{phase.phase}</p>
                <ul className="space-y-1.5 text-sm text-stone-600">
                  {phase.items.map((it) => (
                    <li key={it} className="flex gap-2">
                      <span className="text-stone-300">▢</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Compliance calendar */}
          <h2 className="mt-14 text-xl font-semibold tracking-tight">Compliance calendar</h2>
          <div className="mt-4 overflow-hidden rounded-[var(--radius-card)] border border-stone-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-400">
                <tr>
                  <th className="px-4 py-2 font-medium">When</th>
                  <th className="px-4 py-2 font-medium">What</th>
                  <th className="px-4 py-2 font-medium">Agency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {COMPLIANCE_CALENDAR.map((row) => (
                  <tr key={row.what}>
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium text-ink">{row.when}</td>
                    <td className="px-4 py-2.5 text-stone-600">{row.what}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-stone-500">{row.agency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Rates */}
          <h2 className="mt-14 text-xl font-semibold tracking-tight">
            Rates &amp; thresholds
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Verified {COMPLIANCE_VERIFIED_ON}. Rates change — re-check each January.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {COMPLIANCE_RATES.map((r) => (
              <div
                key={r.item}
                className="flex items-baseline justify-between gap-3 rounded-[var(--radius-base)] border border-stone-200 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{r.item}</p>
                  <p className="text-xs text-stone-500">{r.note}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-ink">{r.value}</span>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div className="mt-10 rounded-[var(--radius-card)] border border-stone-200 bg-stone-50 p-5 text-sm text-stone-600">
            <p className="font-medium text-ink">Self-attested, not legal advice.</p>
            <p className="mt-1">
              This is an operator checklist, not a filing service. Rates, forms,
              and thresholds change. Confirm against the source agency or a
              licensed Thai accountant/lawyer before filing. The Compliance-ready
              badge reflects your own attestation — SHIFTED does not audit your
              filings.
            </p>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
