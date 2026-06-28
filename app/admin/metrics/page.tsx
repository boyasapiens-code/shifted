import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, Container } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Metrics" };

// Shape returned by the admin_metrics() SQL function (migration 0027).
type Metrics = {
  generated_at: string;
  jobs_active: number;
  jobs_total: number;
  jobs_new_30d: number;
  applies_total: number;
  applies_30d: number;
  hires_total: number;
  hires_30d: number;
  employers_total: number;
  candidates_total: number;
  repeat_employers: number;
  jobs_filled: number;
  time_to_fill_median_days: number | null;
  time_to_fill_avg_days: number | null;
  application_funnel: Record<string, number>;
  jobs_by_status: Record<string, number>;
};

// Render the funnel in pipeline order, not whatever order the DB returns.
const FUNNEL: { key: string; label: string }[] = [
  { key: "applied", label: "Applied" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interviewing", label: "Interviewing" },
  { key: "offered", label: "Offered" },
  { key: "hired", label: "Hired" },
  { key: "rejected", label: "Rejected" },
];

const JOB_STATUS: { key: string; label: string }[] = [
  { key: "published", label: "Published" },
  { key: "draft", label: "Draft" },
  { key: "closed", label: "Closed" },
];

const n = (v: number | null | undefined) =>
  v == null ? "—" : v.toLocaleString("en-US");

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-ink tabular-nums">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-stone-400">{sub}</p>}
    </Card>
  );
}

export default async function AdminMetricsPage() {
  const { supabase } = await requireAdmin("/admin/metrics");
  const { data, error } = await supabase.rpc("admin_metrics");
  const m = (data as Metrics | null) ?? null;

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-4xl py-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="eyebrow">Admin · Metrics</p>
            <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-signal">
              <a href="/admin/verifications" className="hover:underline">Verifications</a>
              <a href="/admin/moderation" className="hover:underline">Moderation</a>
              <a href="/admin/data-requests" className="hover:underline">Data requests</a>
            </nav>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Marketplace metrics
          </h1>
          <p className="mt-1 text-stone-500">
            Liquidity, outcomes, and repeat usage — the numbers CLAUDE.md asks us
            to watch. Charge employers; keep workers free.
          </p>

          {!m || error ? (
            <p className="mt-8 rounded-[var(--radius-card)] border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
              {error
                ? "Couldn’t load metrics — check that migration 0027 is applied."
                : "No data yet."}
            </p>
          ) : (
            <>
              {/* Headline KPIs */}
              <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat
                  label="Active jobs"
                  value={n(m.jobs_active)}
                  sub={`${n(m.jobs_total)} ever · ${n(m.jobs_new_30d)} new in 30d`}
                />
                <Stat
                  label="Applies"
                  value={n(m.applies_total)}
                  sub={`${n(m.applies_30d)} in last 30d`}
                />
                <Stat
                  label="Hires"
                  value={n(m.hires_total)}
                  sub={`${n(m.hires_30d)} in last 30d`}
                />
                <Stat
                  label="Time-to-fill"
                  value={
                    m.time_to_fill_median_days == null
                      ? "—"
                      : `${m.time_to_fill_median_days}d`
                  }
                  sub={
                    m.time_to_fill_median_days == null
                      ? "No hires yet"
                      : `median · ${m.time_to_fill_avg_days}d avg`
                  }
                />
              </div>

              {/* Secondary stats */}
              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat
                  label="Repeat employers"
                  value={n(m.repeat_employers)}
                  sub="posted 2+ jobs"
                />
                <Stat label="Employers" value={n(m.employers_total)} />
                <Stat label="Candidates" value={n(m.candidates_total)} />
                <Stat
                  label="Jobs filled"
                  value={n(m.jobs_filled)}
                  sub="≥1 hire"
                />
              </div>

              {/* Application funnel */}
              <h2 className="mt-10 text-lg font-semibold tracking-tight">
                Application funnel
              </h2>
              <Card className="mt-3 p-5">
                {(() => {
                  const max = Math.max(
                    1,
                    ...FUNNEL.map((s) => m.application_funnel[s.key] ?? 0),
                  );
                  return (
                    <div className="space-y-3">
                      {FUNNEL.map((s) => {
                        const v = m.application_funnel[s.key] ?? 0;
                        return (
                          <div key={s.key} className="flex items-center gap-3">
                            <span className="w-28 shrink-0 text-sm text-stone-500">
                              {s.label}
                            </span>
                            <div className="h-6 flex-1 overflow-hidden rounded-full bg-stone-100">
                              <div
                                className="h-full rounded-full bg-signal"
                                style={{ width: `${(v / max) * 100}%` }}
                              />
                            </div>
                            <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-ink">
                              {n(v)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </Card>

              {/* Jobs by status */}
              <h2 className="mt-10 text-lg font-semibold tracking-tight">
                Jobs by status
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {JOB_STATUS.map((s) => (
                  <Stat
                    key={s.key}
                    label={s.label}
                    value={n(m.jobs_by_status[s.key] ?? 0)}
                  />
                ))}
              </div>

              <p className="mt-8 text-xs text-stone-400">
                Snapshot {new Date(m.generated_at).toLocaleString("en-GB")}.
                Time-to-fill = days from a job’s posting to its first hire.
              </p>
            </>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
