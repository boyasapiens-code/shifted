import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, Container, Textarea, buttonClass } from "@/components/ui";
import { VerificationLadder } from "@/components/VerificationBadge";
import { Uploader } from "@/components/Uploader";
import { requireWorker } from "@/lib/auth";
import { VERIFICATION_LEVELS } from "@/lib/constants";
import type { VerificationSubmission } from "@/lib/types";
import { submitVerification, addVerificationDocument } from "./actions";

export const metadata: Metadata = { title: "Get verified" };

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; error?: string }>;
}) {
  const { error, submitted } = await searchParams;
  const { supabase, user } = await requireWorker("/candidate/verification");

  const { data: candidate } = await supabase
    .from("candidate_profiles")
    .select("verification_level")
    .eq("id", user.id)
    .single();
  const level = candidate?.verification_level ?? 0;

  const { data: subs } = await supabase
    .from("verification_submissions")
    .select("*")
    .eq("candidate_id", user.id);
  const byLevel = new Map<number, VerificationSubmission>(
    (subs ?? []).map((s) => [s.level, s as VerificationSubmission]),
  );

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <Link href="/candidate" className="text-sm text-stone-500 hover:text-ink">
            ← Dashboard
          </Link>
          <p className="eyebrow mt-3">Verified screening</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Get verified</h1>
          <p className="mt-1 text-stone-500">
            A SHIFTED profile is earned, not just typed. Each level you clear
            raises your trust badge — and employers can filter to only see
            verified people.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <VerificationLadder level={level} />
            <span className="text-sm font-medium text-ink">Level {level} of 4</span>
          </div>

          {error === "locked" && (
            <p className="mt-4 rounded-[var(--radius-base)] bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Finish the previous level first — they unlock in order.
            </p>
          )}

          <div className="mt-8 space-y-4">
            {VERIFICATION_LEVELS.map((lv) => {
              const sub = byLevel.get(lv.level);
              const prevApproved =
                lv.level === 1 || byLevel.get(lv.level - 1)?.status === "approved";
              const approved = sub?.status === "approved";
              const locked = !prevApproved && !approved;

              return (
                <section
                  key={lv.level}
                  className={`rounded-[var(--radius-base)] border p-5 ${
                    approved ? "border-signal/40 bg-signal/5" : "border-stone-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        Level {lv.level} · {lv.name}
                      </p>
                      <p className="text-sm text-stone-500">{lv.blurb}</p>
                    </div>
                    {sub && (
                      <Badge
                        tone={
                          sub.status === "approved"
                            ? "green"
                            : sub.status === "rejected"
                              ? "red"
                              : "blue"
                        }
                      >
                        {sub.status === "submitted" ? "Under review" : sub.status}
                      </Badge>
                    )}
                  </div>

                  {submitted === String(lv.level) && (
                    <p className="mt-3 rounded-[var(--radius-base)] bg-stone-100 px-3 py-2 text-sm text-ink">
                      ✓ Submitted for review — we'll email you when it's checked.
                    </p>
                  )}

                  {sub?.status === "rejected" && sub.review_note && (
                    <p className="mt-3 rounded-[var(--radius-base)] bg-red-50 px-3 py-2 text-sm text-red-700">
                      Reviewer: {sub.review_note}
                    </p>
                  )}

                  {approved ? (
                    <p className="mt-3 text-sm font-medium text-signal">✓ Approved</p>
                  ) : locked ? (
                    <p className="mt-3 text-sm text-stone-400">
                      Locked — complete level {lv.level - 1} first.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <p className="text-xs text-stone-500">{lv.hint}</p>
                      <div className="max-w-xs">
                        <Uploader
                          userId={user.id}
                          bucket="verification"
                          isPublic={false}
                          accept="image/*,application/pdf"
                          multiple
                          label="Upload evidence"
                          onPersist={addVerificationDocument.bind(null, lv.level)}
                        />
                      </div>
                      {(sub?.documents?.length ?? 0) > 0 && (
                        <p className="text-xs text-stone-500">
                          {sub!.documents.length} document(s) attached
                        </p>
                      )}
                      <form action={submitVerification.bind(null, lv.level)} className="space-y-2">
                        <Textarea
                          name="details"
                          defaultValue={sub?.details ?? ""}
                          className="min-h-20 text-sm"
                          placeholder="Add the details for this level…"
                        />
                        <button type="submit" className={buttonClass("primary", "sm")}>
                          {sub ? "Resubmit for review" : "Submit for review"}
                        </button>
                      </form>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
