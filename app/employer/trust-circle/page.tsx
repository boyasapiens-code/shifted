import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, Container, buttonClass } from "@/components/ui";
import { requireEmployer } from "@/lib/auth";
import {
  TC_RATING_FIELDS,
  TC_STATUS_LABEL,
  NDSCA_VERSION,
  type TcMember,
  type TcSearchHit,
  type TcReferenceRequest,
} from "@/lib/trust-circle";
import { joinTrustCircle, signNdsca, setTier, endorse, requestReference } from "./actions";

export const metadata: Metadata = { title: "Trust Circle — member" };

export default async function EmployerTrustCirclePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; done?: string; error?: string }>;
}) {
  const { q, done, error } = await searchParams;
  const { supabase, user } = await requireEmployer("/employer/trust-circle");

  const { data: memberRow } = await supabase
    .from("tc_member")
    .select("*")
    .eq("employer_id", user.id)
    .maybeSingle<TcMember>();

  const isActive = memberRow?.status === "active" && !!memberRow.ndsca_signed_at;
  const canSearch = isActive && memberRow?.tier === "trust_circle";

  // Workers this employer has managed (for endorsing) — dedup completed engagements.
  const { data: engRows } = await supabase
    .from("engagements")
    .select("worker_id, role_title, candidate_profiles(full_name)")
    .eq("employer_id", user.id)
    .eq("status", "completed");
  const managed = Array.from(
    new Map(
      (engRows ?? []).map((e) => {
        const rel = e.candidate_profiles as
          | { full_name: string | null }
          | { full_name: string | null }[]
          | null;
        const cp = Array.isArray(rel) ? rel[0] : rel;
        return [e.worker_id, { id: e.worker_id, name: cp?.full_name ?? "Worker", role: e.role_title }];
      }),
    ).values(),
  );

  // Pool search (logs a hit per result — by design).
  let hits: TcSearchHit[] = [];
  if (canSearch) {
    const { data } = await supabase.rpc("tc_search", { p_role: q?.trim() || null });
    hits = (data as TcSearchHit[] | null) ?? [];
  }

  // Reference requests I've made.
  const { data: myRequests } = await supabase
    .from("tc_reference_request")
    .select("*")
    .eq("requesting_member_id", memberRow?.id ?? "00000000-0000-0000-0000-000000000000")
    .order("created_at", { ascending: false });

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-3xl py-12">
          <p className="eyebrow">Trust Circle</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Hire on trust, not guesswork
          </h1>
          <p className="mt-2 text-stone-600">
            A private network where operators vouch for people they&apos;ve
            managed — structured ratings only, every worker opted-in, every read
            logged for the worker to see.
          </p>

          {done === "endorsed" && (
            <p className="mt-4 rounded-[var(--radius-base)] bg-stone-100 px-3 py-2 text-sm text-ink">
              Endorsement saved.
            </p>
          )}
          {done === "requested" && (
            <p className="mt-4 rounded-[var(--radius-base)] bg-stone-100 px-3 py-2 text-sm text-ink">
              Reference requested. If the worker hasn&apos;t consented yet, they&apos;ll be invited to.
            </p>
          )}
          {error === "managed" && (
            <p className="mt-4 rounded-[var(--radius-base)] bg-danger/10 px-3 py-2 text-sm text-danger">
              You can only endorse a worker you&apos;ve managed (a completed engagement).
            </p>
          )}

          {/* Membership gate */}
          {!memberRow && (
            <div className="mt-8 rounded-[var(--radius-card)] border border-stone-200 p-6">
              <h2 className="text-lg font-semibold tracking-tight">Join the Trust Circle</h2>
              <ul className="mt-3 space-y-2 text-sm text-stone-600">
                <li>· Endorse people you&apos;ve managed — structured ratings, no free-text gossip.</li>
                <li>· Request references on candidates who&apos;ve opted in.</li>
                <li>· Trust Circle tier unlocks search of the opted-in talent pool.</li>
              </ul>
              <p className="mt-3 text-xs text-stone-400">
                Built on four guardrails: consent-gated, no sensitive or pay data,
                no free-text about workers, and full audit visibility for the worker.
              </p>
              <form action={joinTrustCircle} className="mt-4">
                <button className={buttonClass("primary", "md")} type="submit">
                  Join (start on probation)
                </button>
              </form>
            </div>
          )}

          {memberRow && !memberRow.ndsca_signed_at && (
            <div className="mt-8 rounded-[var(--radius-card)] border border-stone-200 p-6">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">Sign the agreement</h2>
                <Badge>{TC_STATUS_LABEL[memberRow.status]}</Badge>
              </div>
              <p className="mt-2 text-sm text-stone-600">
                Network access requires a signed Non-Disclosure &amp; Safe-Conduct
                Agreement ({NDSCA_VERSION}): use data only to evaluate hires, never to
                coordinate pay or boycott workers, and respect every worker&apos;s
                consent and right to respond.
              </p>
              <form action={signNdsca} className="mt-4">
                <label className="flex items-center gap-2 text-sm text-stone-700">
                  <input type="checkbox" name="agree" className="h-4 w-4 accent-[var(--color-signal)]" />
                  I have read and agree to the NDSCA.
                </label>
                <button className={buttonClass("primary", "md") + " mt-3"} type="submit">
                  Sign &amp; activate
                </button>
              </form>
            </div>
          )}

          {isActive && (
            <>
              <div className="mt-6 flex flex-wrap items-center gap-2 rounded-[var(--radius-base)] border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
                <Badge tone="green">Active member</Badge>
                <Badge tone={memberRow!.tier === "trust_circle" ? "blue" : undefined}>
                  {memberRow!.tier === "trust_circle" ? "Trust Circle tier" : "Growth tier"}
                </Badge>
                {memberRow!.tier !== "trust_circle" && (
                  <form action={setTier.bind(null, "trust_circle")} className="ml-auto">
                    <button className={buttonClass("outline", "sm")} type="submit">
                      Unlock pool search →
                    </button>
                  </form>
                )}
              </div>

              {/* Search */}
              <h2 className="mt-10 text-lg font-semibold tracking-tight">Search the talent pool</h2>
              {canSearch ? (
                <>
                  <form method="get" className="mt-3 flex gap-2">
                    <input
                      type="text"
                      name="q"
                      defaultValue={q ?? ""}
                      placeholder="Role or headline, e.g. barista"
                      className="flex-1 rounded-[var(--radius-base)] border border-stone-200 px-3 py-2 text-sm"
                    />
                    <button className={buttonClass("primary", "md")} type="submit">
                      Search
                    </button>
                  </form>
                  <div className="mt-4 space-y-3">
                    {hits.length === 0 ? (
                      <p className="text-sm text-stone-400">
                        No opted-in workers match. Only consented profiles appear here.
                      </p>
                    ) : (
                      hits.map((h) => (
                        <div
                          key={h.worker_id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-stone-200 p-4"
                        >
                          <div>
                            <p className="font-medium text-ink">{h.full_name ?? "Worker"}</p>
                            <p className="text-sm text-stone-500">
                              {h.headline ?? "—"}
                              {h.location ? ` · ${h.location}` : ""}
                            </p>
                            <p className="mt-0.5 text-xs text-stone-400">
                              {h.endorsement_count} endorsement
                              {h.endorsement_count === 1 ? "" : "s"}
                              {h.avg_reliability != null && ` · ${h.avg_reliability}★ reliability`}
                              {h.would_rehire_count > 0 && ` · ${h.would_rehire_count} would re-hire`}
                            </p>
                          </div>
                          <form action={requestReference.bind(null, h.worker_id)}>
                            <button className={buttonClass("outline", "sm")} type="submit">
                              Request reference
                            </button>
                          </form>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <p className="mt-3 rounded-[var(--radius-card)] border border-dashed border-stone-300 p-6 text-sm text-stone-500">
                  Pool search is a Trust Circle tier benefit. Unlock it above.
                </p>
              )}

              {/* Endorse a managed worker */}
              <h2 className="mt-12 text-lg font-semibold tracking-tight">
                Endorse someone you&apos;ve managed
              </h2>
              {managed.length === 0 ? (
                <p className="mt-3 text-sm text-stone-400">
                  You can endorse a worker once you have a completed engagement with them.
                  See <Link href="/employer/engagements" className="text-signal hover:underline">Engagements</Link>.
                </p>
              ) : (
                <form action={endorse} className="mt-3 rounded-[var(--radius-card)] border border-stone-200 p-5">
                  <label className="text-sm font-medium text-ink">Worker</label>
                  <select
                    name="worker"
                    className="mt-1 w-full rounded-[var(--radius-base)] border border-stone-200 px-3 py-2 text-sm"
                  >
                    {managed.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {m.role ? ` — ${m.role}` : ""}
                      </option>
                    ))}
                  </select>

                  <label className="mt-3 block text-sm font-medium text-ink">Role they did</label>
                  <input
                    name="role"
                    required
                    placeholder="e.g. Barista"
                    className="mt-1 w-full rounded-[var(--radius-base)] border border-stone-200 px-3 py-2 text-sm"
                  />

                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {TC_RATING_FIELDS.map((f) => (
                      <div key={f.key}>
                        <label className="text-xs font-medium text-stone-500">{f.label}</label>
                        <select
                          name={f.key}
                          defaultValue="4"
                          className="mt-1 w-full rounded-[var(--radius-base)] border border-stone-200 px-2 py-1.5 text-sm"
                        >
                          {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>
                              {n} ★
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <label className="mt-4 flex items-center gap-2 text-sm text-stone-700">
                    <input type="checkbox" name="would_rehire" defaultChecked className="h-4 w-4 accent-[var(--color-signal)]" />
                    I would re-hire this person
                  </label>

                  <button className={buttonClass("primary", "md") + " mt-4"} type="submit">
                    Save endorsement
                  </button>
                  <p className="mt-2 text-xs text-stone-400">
                    Structured ratings only. There is no free-text field — by design.
                  </p>
                </form>
              )}

              {/* My reference requests */}
              {myRequests && myRequests.length > 0 && (
                <>
                  <h2 className="mt-12 text-lg font-semibold tracking-tight">
                    Your reference requests
                  </h2>
                  <ul className="mt-3 divide-y divide-stone-100 rounded-[var(--radius-card)] border border-stone-200">
                    {(myRequests as TcReferenceRequest[]).map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                        <span className="text-stone-600">
                          Request · {new Date(r.created_at).toLocaleDateString("en-GB")}
                        </span>
                        <Badge tone={r.status === "answered" ? "green" : r.status === "blocked_no_consent" ? "red" : undefined}>
                          {r.status === "blocked_no_consent" ? "Awaiting consent" : r.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}

          <p className="mt-12 text-xs text-stone-400">
            The Trust Circle is consent-gated and audited. Not legal advice; the
            consent copy and member agreement are reviewed before production use.
          </p>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
