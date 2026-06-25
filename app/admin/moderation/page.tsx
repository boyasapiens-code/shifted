import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, Container, buttonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { reviewModeration, resolveReport, runConsole } from "../actions";

export const metadata: Metadata = { title: "Moderation queue" };

type Decision = {
  id: string;
  content_type: string;
  action: string;
  excerpt: string | null;
  legal_codes: string[];
  policy_codes: string[];
  escalate: boolean;
  reason_en: string | null;
  confidence: number;
  model_version: string;
  created_at: string;
};

type Report = {
  id: string;
  content_type: string;
  reason: string;
  detail: string | null;
  created_at: string;
};

const ACTION_TONE: Record<string, "green" | "amber" | "blue" | "red" | undefined> = {
  ALLOW: "green",
  SOFTEN: "amber",
  HOLD: "blue",
  BLOCK: "red",
};

function Codes({ d }: { d: Decision }) {
  const all = [...d.legal_codes, ...d.policy_codes];
  if (!all.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {all.map((c) => (
        <span key={c} className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-600">
          {c}
        </span>
      ))}
    </div>
  );
}

export default async function AdminModerationPage() {
  const { supabase } = await requireAdmin("/admin/moderation");

  const [{ data: held }, { data: escalated }, { data: console_ }, { data: reports }] =
    await Promise.all([
      supabase
        .from("moderation_decisions")
        .select("*")
        .eq("action", "HOLD")
        .is("review_action", null)
        .neq("content_type", "console")
        .order("created_at", { ascending: false }),
      supabase
        .from("moderation_decisions")
        .select("*")
        .eq("escalate", true)
        .is("review_action", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("moderation_decisions")
        .select("*")
        .eq("content_type", "console")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("content_reports")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false }),
    ]);

  const heldRows = (held as Decision[] | null) ?? [];
  const escRows = (escalated as Decision[] | null) ?? [];
  const consoleRows = (console_ as Decision[] | null) ?? [];
  const reportRows = (reports as Report[] | null) ?? [];

  const DecisionCard = ({ d, urgent }: { d: Decision; urgent?: boolean }) => (
    <div className={`rounded-[var(--radius-card)] border p-4 ${urgent ? "border-danger/40 bg-danger/5" : "border-stone-200"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={ACTION_TONE[d.action]}>{d.action}</Badge>
        <span className="text-xs text-stone-400">{d.content_type}</span>
        {d.escalate && <Badge tone="red">Escalate</Badge>}
        <span className="ml-auto text-xs text-stone-400">{d.model_version}</span>
      </div>
      <p className="mt-2 text-sm text-stone-700">{d.reason_en}</p>
      {d.excerpt && (
        <p className="mt-2 rounded bg-stone-50 p-2 text-sm italic text-stone-600">“{d.excerpt}”</p>
      )}
      <Codes d={d} />
      <div className="mt-3 flex gap-2">
        <form action={reviewModeration.bind(null, d.id, "allowed")}>
          <button className={buttonClass("outline", "sm")} type="submit">Allow</button>
        </form>
        <form action={reviewModeration.bind(null, d.id, "blocked")}>
          <button className={buttonClass("ghost", "sm")} type="submit">Block</button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-3xl py-12">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">Admin · Moderation</p>
            <a href="/admin/verifications" className="text-sm font-medium text-signal hover:underline">
              Verification queue →
            </a>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Moderation queue</h1>
          <p className="mt-1 text-stone-500">
            The AI filters and flags; you confirm. Hard blocks (sensitive data,
            threats, doxxing) never publish; held items wait for your call.
          </p>

          {/* Escalated */}
          {escRows.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-danger">Urgent — escalated ({escRows.length})</h2>
              <div className="mt-3 space-y-3">
                {escRows.map((d) => (
                  <DecisionCard key={d.id} d={d} urgent />
                ))}
              </div>
            </section>
          )}

          {/* Held */}
          <section className="mt-8">
            <h2 className="text-lg font-semibold tracking-tight">Held for review ({heldRows.length})</h2>
            {heldRows.length === 0 ? (
              <p className="mt-3 text-sm text-stone-400">Nothing held. The queue is clear.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {heldRows.map((d) => (
                  <DecisionCard key={d.id} d={d} />
                ))}
              </div>
            )}
          </section>

          {/* Reports */}
          <section className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight">Reports ({reportRows.length})</h2>
            {reportRows.length === 0 ? (
              <p className="mt-3 text-sm text-stone-400">No open reports.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {reportRows.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-stone-200 p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge tone="red">{r.reason}</Badge>
                        <span className="text-xs text-stone-400">{r.content_type}</span>
                      </div>
                      {r.detail && <p className="mt-1 text-sm text-stone-600">{r.detail}</p>}
                    </div>
                    <div className="flex gap-2">
                      <form action={resolveReport.bind(null, r.id, "actioned")}>
                        <button className={buttonClass("outline", "sm")} type="submit">Actioned</button>
                      </form>
                      <form action={resolveReport.bind(null, r.id, "dismissed")}>
                        <button className={buttonClass("ghost", "sm")} type="submit">Dismiss</button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Test console */}
          <section id="console" className="mt-12 scroll-mt-20">
            <h2 className="text-lg font-semibold tracking-tight">Test console</h2>
            <p className="mt-1 text-sm text-stone-500">
              Paste content to see how the engine classifies it (logged as a test
              decision). Useful for calibration.
            </p>
            <form action={runConsole} className="mt-3 rounded-[var(--radius-card)] border border-stone-200 p-4">
              <textarea
                name="text"
                rows={3}
                required
                placeholder="e.g. This owner is a thief who steals everyone's wages."
                className="w-full rounded-[var(--radius-base)] border border-stone-200 p-2 text-sm"
              />
              <div className="mt-2 flex items-center gap-2">
                <select name="content_type" defaultValue="review" className="rounded-[var(--radius-base)] border border-stone-200 px-2 py-1.5 text-sm">
                  <option value="review">review</option>
                  <option value="job_post">job_post</option>
                  <option value="message">message</option>
                  <option value="profile">profile</option>
                </select>
                <button className={buttonClass("primary", "sm")} type="submit">Classify</button>
              </div>
            </form>
            {consoleRows.length > 0 && (
              <div className="mt-4 space-y-2">
                {consoleRows.map((d) => (
                  <div key={d.id} className="rounded-[var(--radius-card)] border border-stone-200 p-3">
                    <div className="flex items-center gap-2">
                      <Badge tone={ACTION_TONE[d.action]}>{d.action}</Badge>
                      <span className="text-xs text-stone-400">
                        conf {Math.round(d.confidence * 100)}% · {d.model_version}
                      </span>
                    </div>
                    {d.excerpt && <p className="mt-1 text-sm italic text-stone-600">“{d.excerpt}”</p>}
                    <p className="mt-1 text-sm text-stone-700">{d.reason_en}</p>
                    <Codes d={d} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
