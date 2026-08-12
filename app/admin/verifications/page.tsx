import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, Container, Input, buttonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import {
  VERIFICATION_LEVEL_NAME,
  EMPLOYER_VERIFICATION_LAYER_NAME,
} from "@/lib/constants";
import {
  approveVerification,
  rejectVerification,
  approveEmployerVerification,
  rejectEmployerVerification,
} from "../actions";

export const metadata: Metadata = { title: "Verification queue" };

type Item = {
  id: string;
  kind: "worker" | "employer";
  subject: string;
  level: number;
  levelName: string;
  status: string;
  details: string | null;
  documents: string[];
  created_at: string;
};

export default async function AdminVerificationsPage() {
  const { supabase } = await requireAdmin("/admin/verifications");

  const [{ data: cand }, { data: emp }] = await Promise.all([
    supabase
      .from("verification_submissions")
      .select("id, level, status, details, documents, created_at, candidate:candidate_profiles(full_name)"),
    supabase
      .from("employer_verification_submissions")
      .select("id, layer, status, details, documents, created_at, employer:employer_profiles(company_name)"),
  ]);

  const items: Item[] = [
    ...(cand ?? []).map((s) => {
      const c = Array.isArray(s.candidate) ? s.candidate[0] : s.candidate;
      return {
        id: s.id,
        kind: "worker" as const,
        subject: c?.full_name ?? "Candidate",
        level: s.level,
        levelName: VERIFICATION_LEVEL_NAME[s.level],
        status: s.status,
        details: s.details,
        documents: s.documents ?? [],
        created_at: s.created_at,
      };
    }),
    ...(emp ?? []).map((s) => {
      const e = Array.isArray(s.employer) ? s.employer[0] : s.employer;
      return {
        id: s.id,
        kind: "employer" as const,
        subject: e?.company_name ?? "Employer",
        level: s.layer,
        levelName: EMPLOYER_VERIFICATION_LAYER_NAME[s.layer],
        status: s.status,
        details: s.details,
        documents: s.documents ?? [],
        created_at: s.created_at,
      };
    }),
  ].sort((a, b) => a.created_at.localeCompare(b.created_at));

  const pending = items.filter((i) => i.status === "submitted");
  const decided = items.filter((i) => i.status !== "submitted");

  const signedById = new Map<string, string[]>();
  for (const i of pending) {
    const urls: string[] = [];
    for (const p of i.documents) {
      const { data } = await supabase.storage.from("verification").createSignedUrl(p, 3600);
      if (data?.signedUrl) urls.push(data.signedUrl);
    }
    signedById.set(i.id, urls);
  }

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-3xl py-12">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">Admin · Reviewer</p>
            <span className="flex flex-wrap gap-4">
              <a href="/admin/metrics" className="text-sm font-medium text-signal hover:underline">
                Metrics →
              </a>
              <a href="/admin/moderation" className="text-sm font-medium text-signal hover:underline">
                Moderation →
              </a>
              <a href="/admin/questions" className="text-sm font-medium text-signal hover:underline">
                Questions →
              </a>
              <a href="/admin/data-requests" className="text-sm font-medium text-signal hover:underline">
                Data requests →
              </a>
              <a href="/admin/marketing" className="text-sm font-medium text-signal hover:underline">
                Marketing leads →
              </a>
              <a href="/admin/content" className="text-sm font-medium text-signal hover:underline">
                Content →
              </a>
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Verification queue
          </h1>
          <p className="mt-1 text-stone-500">
            Both sides get vetted. Approve or reject each submitted level —
            approving raises that party&apos;s trust badge.
          </p>

          <h2 className="mt-10 text-lg font-semibold">Pending ({pending.length})</h2>
          {pending.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {pending.map((i) => {
                const urls = signedById.get(i.id) ?? [];
                const approve = i.kind === "worker" ? approveVerification : approveEmployerVerification;
                const reject = i.kind === "worker" ? rejectVerification : rejectEmployerVerification;
                return (
                  <li key={i.id} className="rounded-[var(--radius-base)] border border-stone-200 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">{i.subject}</p>
                        <p className="text-sm text-stone-500">
                          {i.kind === "worker" ? "Level" : "Layer"} {i.level} · {i.levelName}
                        </p>
                      </div>
                      <Badge tone={i.kind === "employer" ? "amber" : "blue"}>
                        {i.kind === "worker" ? "Candidate" : "Employer"}
                      </Badge>
                    </div>

                    {i.details && (
                      <p className="mt-3 whitespace-pre-wrap border-l-2 border-stone-200 pl-3 text-sm text-stone-700">
                        {i.details}
                      </p>
                    )}
                    {urls.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {urls.map((u, idx) => (
                          <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-ink underline">
                            Evidence {idx + 1}
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-end gap-2">
                      <form action={approve.bind(null, i.id)}>
                        <button className={buttonClass("primary", "sm")}>Approve</button>
                      </form>
                      <form action={reject.bind(null, i.id)} className="flex items-end gap-2">
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
                {decided.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-medium text-ink">{i.subject}</p>
                      <p className="text-sm text-stone-500">
                        {i.kind === "worker" ? "Level" : "Layer"} {i.level} · {i.levelName}
                      </p>
                    </div>
                    <Badge tone={i.status === "approved" ? "green" : "red"}>{i.status}</Badge>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
