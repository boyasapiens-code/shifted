import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, Container, Input, buttonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { VERIFICATION_LEVEL_NAME } from "@/lib/constants";
import { approveVerification, rejectVerification } from "../actions";

export const metadata: Metadata = { title: "Verification queue" };

export default async function AdminVerificationsPage() {
  const { supabase } = await requireAdmin("/admin/verifications");

  const { data: subs } = await supabase
    .from("verification_submissions")
    .select(
      "id, level, status, details, documents, created_at, candidate:candidate_profiles(id, full_name, headline)",
    )
    .order("created_at", { ascending: true });

  const pending = (subs ?? []).filter((s) => s.status === "submitted");
  const decided = (subs ?? []).filter((s) => s.status !== "submitted");

  // Pre-resolve signed URLs for evidence (admin reads the private bucket).
  const signedById = new Map<string, string[]>();
  for (const s of pending) {
    const urls: string[] = [];
    for (const p of s.documents ?? []) {
      const { data } = await supabase.storage
        .from("verification")
        .createSignedUrl(p, 3600);
      if (data?.signedUrl) urls.push(data.signedUrl);
    }
    signedById.set(s.id, urls);
  }

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-3xl py-12">
          <p className="eyebrow">Admin · Reviewer</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Verification queue
          </h1>
          <p className="mt-1 text-stone-500">
            Approve or reject each submitted level. Approving raises the
            candidate&apos;s trust badge.
          </p>

          <h2 className="mt-10 text-lg font-semibold">
            Pending ({pending.length})
          </h2>
          {pending.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {pending.map((s) => {
                const c = Array.isArray(s.candidate) ? s.candidate[0] : s.candidate;
                const urls = signedById.get(s.id) ?? [];
                return (
                  <li key={s.id} className="rounded-[var(--radius-base)] border border-stone-200 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">{c?.full_name ?? "Candidate"}</p>
                        <p className="text-sm text-stone-500">
                          Level {s.level} · {VERIFICATION_LEVEL_NAME[s.level]}
                        </p>
                      </div>
                      <Badge tone="blue">Under review</Badge>
                    </div>

                    {s.details && (
                      <p className="mt-3 whitespace-pre-wrap border-l-2 border-stone-200 pl-3 text-sm text-stone-700">
                        {s.details}
                      </p>
                    )}
                    {urls.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {urls.map((u, i) => (
                          <a
                            key={u}
                            href={u}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-ink underline"
                          >
                            Evidence {i + 1}
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-end gap-2">
                      <form action={approveVerification.bind(null, s.id)}>
                        <button className={buttonClass("primary", "sm")}>Approve</button>
                      </form>
                      <form action={rejectVerification.bind(null, s.id)} className="flex items-end gap-2">
                        <Input name="note" placeholder="Reason (optional)" className="h-9 w-56 text-sm" />
                        <button className={buttonClass("outline", "sm")}>Reject</button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-4 rounded-[var(--radius-base)] border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
              Nothing waiting for review.
            </div>
          )}

          {decided.length > 0 && (
            <>
              <h2 className="mt-12 text-lg font-semibold">Recently decided</h2>
              <ul className="mt-4 divide-y divide-stone-100 rounded-[var(--radius-base)] border border-stone-200">
                {decided.map((s) => {
                  const c = Array.isArray(s.candidate) ? s.candidate[0] : s.candidate;
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <p className="font-medium text-ink">{c?.full_name ?? "Candidate"}</p>
                        <p className="text-sm text-stone-500">
                          Level {s.level} · {VERIFICATION_LEVEL_NAME[s.level]}
                        </p>
                      </div>
                      <Badge tone={s.status === "approved" ? "green" : "red"}>{s.status}</Badge>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
