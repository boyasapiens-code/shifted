import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, Container, buttonClass } from "@/components/ui";
import { requireWorker } from "@/lib/auth";
import {
  TC_CONSENT_SCOPES,
  TC_RATING_FIELDS,
  TC_ACCESS_ACTION_LABEL,
  type TcConsent,
  type TcEndorsement,
  type TcResponse,
  type TcAccessLogRow,
} from "@/lib/trust-circle";
import { grantConsent, withdrawConsent, respond } from "./actions";

export const metadata: Metadata = { title: "Trust Circle — your consent & record" };

function Stars({ n }: { n: number }) {
  return (
    <span className="text-sm" aria-label={`${n} of 5`}>
      <span className="text-ink">{"★".repeat(n)}</span>
      <span className="text-stone-300">{"★".repeat(5 - n)}</span>
    </span>
  );
}

export default async function WorkerTrustCirclePage() {
  const { supabase, user } = await requireWorker("/candidate/trust-circle");

  const [{ data: consents }, { data: endorsements }, { data: responses }, { data: accessLog }] =
    await Promise.all([
      supabase.from("tc_worker_consent").select("*").eq("worker_id", user.id),
      supabase
        .from("tc_endorsement")
        .select("*")
        .eq("worker_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("tc_worker_response").select("*").eq("worker_id", user.id),
      supabase
        .from("tc_access_log")
        .select("*")
        .eq("worker_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  const active = new Set(
    (consents as TcConsent[] | null)?.filter((c) => c.status === "active").map((c) => c.scope) ?? [],
  );
  const responseFor = (id: string) =>
    (responses as TcResponse[] | null)?.find((r) => r.target_id === id) ?? null;

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <p className="eyebrow">Trust Circle</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Your consent, your record
          </h1>
          <p className="mt-2 text-stone-600">
            The Trust Circle is a private network where employers can vouch for
            people they&apos;ve worked with. Nothing about you is shared until you
            opt in — and you can see every time a member views your data, and
            respond to anything said about you.
          </p>
          <p className="mt-1 text-sm text-stone-500">
            เครือข่ายส่วนตัวสำหรับการรับรองพนักงาน — ไม่มีการแชร์ข้อมูลของคุณจนกว่าคุณจะยินยอม
            และคุณเห็นทุกครั้งที่มีการเข้าดูข้อมูล
          </p>

          {/* Consent toggles */}
          <h2 className="mt-10 text-lg font-semibold tracking-tight">Your consent</h2>
          <div className="mt-3 space-y-3">
            {TC_CONSENT_SCOPES.map((s) => {
              const on = active.has(s.scope);
              return (
                <div
                  key={s.scope}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-[var(--radius-card)] border border-stone-200 p-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-ink">{s.title}</p>
                      {on ? <Badge tone="green">On</Badge> : <Badge>Off</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-stone-600">{s.desc}</p>
                    <p className="mt-0.5 text-xs text-stone-400">{s.desc_th}</p>
                  </div>
                  <form action={on ? withdrawConsent.bind(null, s.scope) : grantConsent.bind(null, s.scope)}>
                    <button className={buttonClass(on ? "outline" : "primary", "sm")} type="submit">
                      {on ? "Turn off" : "Allow"}
                    </button>
                  </form>
                </div>
              );
            })}
          </div>

          {/* Endorsements about you */}
          <h2 className="mt-12 text-lg font-semibold tracking-tight">
            Endorsements about you
          </h2>
          {endorsements && endorsements.length > 0 ? (
            <div className="mt-3 space-y-4">
              {(endorsements as TcEndorsement[]).map((e) => {
                const r = responseFor(e.id);
                return (
                  <div key={e.id} className="rounded-[var(--radius-card)] border border-stone-200 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-ink">{e.role_confirmed}</p>
                      {e.would_rehire && <Badge tone="green">Would re-hire</Badge>}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
                      {TC_RATING_FIELDS.map((f) => (
                        <div key={f.key}>
                          <p className="text-xs text-stone-500">{f.label}</p>
                          <Stars n={e[f.key]} />
                        </div>
                      ))}
                    </div>
                    {r ? (
                      <div className="mt-4 rounded-[var(--radius-base)] bg-stone-50 p-3 text-sm">
                        <p className="text-xs font-medium text-stone-500">Your response</p>
                        <p className="mt-1 text-stone-700">{r.body}</p>
                      </div>
                    ) : (
                      <form action={respond} className="mt-4">
                        <input type="hidden" name="target_type" value="endorsement" />
                        <input type="hidden" name="target_id" value={e.id} />
                        <label className="text-xs font-medium text-stone-500">
                          Add your response (only you can do this)
                        </label>
                        <textarea
                          name="body"
                          rows={2}
                          required
                          placeholder="Add context in your own words…"
                          className="mt-1 w-full rounded-[var(--radius-base)] border border-stone-200 p-2 text-sm"
                        />
                        <button className={buttonClass("outline", "sm") + " mt-2"} type="submit">
                          Post response
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 rounded-[var(--radius-card)] border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
              No endorsements yet. Past managers can vouch for you with structured
              ratings — never free-text opinions.
            </p>
          )}

          {/* Access log */}
          <h2 className="mt-12 text-lg font-semibold tracking-tight">
            Who&apos;s viewed your data
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Every read is logged here. No silent access.
          </p>
          {accessLog && accessLog.length > 0 ? (
            <ul className="mt-3 divide-y divide-stone-100 rounded-[var(--radius-card)] border border-stone-200">
              {(accessLog as TcAccessLogRow[]).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="text-stone-700">{TC_ACCESS_ACTION_LABEL[a.action]}</span>
                  <span className="text-xs text-stone-400">
                    {new Date(a.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-stone-400">No access yet.</p>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
