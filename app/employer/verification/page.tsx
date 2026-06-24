import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, Container, Textarea, buttonClass } from "@/components/ui";
import { VerificationLadder } from "@/components/VerificationBadge";
import { Uploader } from "@/components/Uploader";
import { requireEmployer } from "@/lib/auth";
import { EMPLOYER_VERIFICATION_LAYERS } from "@/lib/constants";
import {
  submitEmployerVerification,
  addEmployerVerificationDocument,
} from "./actions";

export const metadata: Metadata = { title: "Get verified" };

export default async function EmployerVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { supabase, user } = await requireEmployer("/employer/verification");

  const { data: employer } = await supabase
    .from("employer_profiles")
    .select("verification_level")
    .eq("id", user.id)
    .single();
  const level = employer?.verification_level ?? 0;

  const { data: subs } = await supabase
    .from("employer_verification_submissions")
    .select("*")
    .eq("employer_id", user.id);
  const byLayer = new Map((subs ?? []).map((s) => [s.layer, s]));

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <Link href="/employer" className="text-sm text-stone-500 hover:text-ink">
            ← Dashboard
          </Link>
          <p className="eyebrow mt-3">Business verification</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Earn your trust badge
          </h1>
          <p className="mt-1 text-stone-500">
            Workers deserve the same protection from bad employers that you get
            from bad hires. Clear each layer to prove you&apos;re a real, fair
            workplace — and candidates can filter to verified employers only.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <VerificationLadder level={level} />
            <span className="text-sm font-medium text-ink">Layer {level} of 4</span>
          </div>

          {error === "locked" && (
            <p className="mt-4 rounded-[var(--radius-base)] bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Finish the previous layer first — they unlock in order.
            </p>
          )}

          <div className="mt-8 space-y-4">
            {EMPLOYER_VERIFICATION_LAYERS.map((ly) => {
              const sub = byLayer.get(ly.level);
              const prevApproved =
                ly.level === 1 || byLayer.get(ly.level - 1)?.status === "approved";
              const approved = sub?.status === "approved";
              const locked = !prevApproved && !approved;

              return (
                <section
                  key={ly.level}
                  className={`rounded-[var(--radius-base)] border p-5 ${
                    approved ? "border-signal/40 bg-signal/5" : "border-stone-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        Layer {ly.level} · {ly.name}
                      </p>
                      <p className="text-sm text-stone-500">{ly.blurb}</p>
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

                  {sub?.status === "rejected" && sub.review_note && (
                    <p className="mt-3 rounded-[var(--radius-base)] bg-red-50 px-3 py-2 text-sm text-red-700">
                      Reviewer: {sub.review_note}
                    </p>
                  )}

                  {approved ? (
                    <p className="mt-3 text-sm font-medium text-signal">✓ Approved</p>
                  ) : locked ? (
                    <p className="mt-3 text-sm text-stone-400">
                      Locked — complete layer {ly.level - 1} first.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <p className="text-xs text-stone-500">{ly.hint}</p>
                      <div className="max-w-xs">
                        <Uploader
                          userId={user.id}
                          bucket="verification"
                          isPublic={false}
                          accept="image/*,application/pdf"
                          multiple
                          label="Upload evidence"
                          onPersist={addEmployerVerificationDocument.bind(null, ly.level)}
                        />
                      </div>
                      {(sub?.documents?.length ?? 0) > 0 && (
                        <p className="text-xs text-stone-500">
                          {sub!.documents.length} document(s) attached
                        </p>
                      )}
                      <form action={submitEmployerVerification.bind(null, ly.level)} className="space-y-2">
                        <Textarea
                          name="details"
                          defaultValue={sub?.details ?? ""}
                          className="min-h-20 text-sm"
                          placeholder="Add the details / links for this layer…"
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
