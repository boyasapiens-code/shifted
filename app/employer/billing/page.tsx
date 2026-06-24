import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, Container, buttonClass } from "@/components/ui";
import { requireEmployer } from "@/lib/auth";
import { PRO_FEATURES, OUTCOME_PRICING } from "@/lib/constants";
import {
  upgradeToPro,
  downgradeToFree,
  toggleFeatured,
} from "./actions";

export const metadata: Metadata = { title: "Plan & billing" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ gate?: string; upgraded?: string }>;
}) {
  const { gate, upgraded } = await searchParams;
  const { supabase, user } = await requireEmployer("/employer/billing");

  const { data: employer } = await supabase
    .from("employer_profiles")
    .select("plan, featured")
    .eq("id", user.id)
    .single();
  const isPro = employer?.plan === "pro";

  // Outcome-aligned billing ledger.
  const { data: events } = await supabase
    .from("billing_events")
    .select("id, type, amount_thb, occurred_at, worker:candidate_profiles(full_name)")
    .eq("employer_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(20);
  const accrued = (events ?? []).reduce((sum, e) => sum + (e.amount_thb ?? 0), 0);

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-3xl py-12">
          <Link href="/employer" className="text-sm text-stone-500 hover:text-ink">
            ← Dashboard
          </Link>
          <div className="mt-3 flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">Plan &amp; billing</h1>
            <Badge tone={isPro ? "green" : "default"}>
              {isPro ? "Pro" : "Free"}
            </Badge>
          </div>
          <p className="mt-1 text-stone-500">
            Free for workers, always. Employers upgrade for reach.
          </p>

          {upgraded && (
            <p className="mt-4 rounded-[var(--radius-base)] bg-success/10 px-3 py-2 text-sm text-success">
              You&apos;re on Pro. (Billing isn&apos;t live yet — this activated Pro
              for preview.)
            </p>
          )}
          {gate === "boost" && (
            <p className="mt-4 rounded-[var(--radius-base)] bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Boosting a job is a Pro feature. Upgrade to promote your roles.
            </p>
          )}
          {gate === "featured" && (
            <p className="mt-4 rounded-[var(--radius-base)] bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Featured placement is a Pro feature. Upgrade to get featured.
            </p>
          )}

          {/* Outcome-aligned pricing — the wedge */}
          <section className="mt-8 rounded-[var(--radius-card)] border-2 border-ink p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">How you pay</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  You pay for outcomes — never clicks.
                </h2>
                <p className="mt-1 max-w-md text-sm text-stone-600">
                  Unlike job boards, SHIFTED bills you when you actually hire, and
                  when your people stay. No paying for unqualified applicants.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(OUTCOME_PRICING)
                .filter(([k]) => k !== "qualified_match")
                .map(([k, v]) => (
                  <div key={k} className="rounded-[var(--radius-base)] bg-stone-50 p-4">
                    <p className="text-2xl font-semibold tracking-tight">
                      ฿{v.amount.toLocaleString("en-US")}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-ink">{v.label}</p>
                    <p className="text-xs text-stone-500">{v.blurb}</p>
                  </div>
                ))}
            </div>

            {/* Ledger */}
            <div className="mt-6 border-t border-stone-100 pt-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink">Your outcomes</p>
                <p className="text-sm text-stone-500">
                  Accrued (preview):{" "}
                  <span className="font-semibold text-ink">
                    ฿{accrued.toLocaleString("en-US")}
                  </span>
                </p>
              </div>
              {events && events.length > 0 ? (
                <ul className="mt-3 divide-y divide-stone-100">
                  {events.map((e) => {
                    const w = Array.isArray(e.worker) ? e.worker[0] : e.worker;
                    return (
                      <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <span className="text-ink">
                          {OUTCOME_PRICING[e.type]?.label ?? e.type}
                          <span className="text-stone-400"> · {w?.full_name ?? "—"}</span>
                        </span>
                        <span className="font-medium text-ink">
                          ฿{(e.amount_thb ?? 0).toLocaleString("en-US")}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-stone-500">
                  No outcomes yet. Hire a candidate and bill events appear here.
                </p>
              )}
              <p className="mt-3 text-xs text-stone-400">
                Billing isn&apos;t live yet — events accrue for preview, no charge
                is taken.
              </p>
            </div>
          </section>

          <h2 className="mt-12 text-lg font-semibold tracking-tight">
            Optional add-ons
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Extra reach on top of outcome pricing.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {/* Free */}
            <div className="rounded-[var(--radius-base)] border border-stone-200 p-6">
              <p className="eyebrow">Free</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">฿0</p>
              <ul className="mt-4 space-y-2 text-sm text-stone-600">
                <li>Post jobs &amp; review applicants</li>
                <li>Verification &amp; reference network</li>
                <li>Two-way reviews</li>
              </ul>
              {!isPro && (
                <p className="mt-5 text-sm font-medium text-stone-500">
                  Your current plan
                </p>
              )}
              {isPro && (
                <form action={downgradeToFree} className="mt-5">
                  <button className={buttonClass("outline", "sm", "w-full")}>
                    Downgrade to Free
                  </button>
                </form>
              )}
            </div>

            {/* Pro */}
            <div className="rounded-[var(--radius-base)] border-2 border-signal p-6">
              <div className="flex items-center justify-between">
                <p className="eyebrow text-signal">Pro</p>
                <Badge tone="blue">Most popular</Badge>
              </div>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                ฿990<span className="text-base font-normal text-stone-500">/mo</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-stone-600">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-signal">✓</span> {f}
                  </li>
                ))}
              </ul>
              {isPro ? (
                <p className="mt-5 text-sm font-medium text-signal">Your current plan</p>
              ) : (
                <form action={upgradeToPro} className="mt-5">
                  <button className={buttonClass("primary", "md", "w-full")}>
                    Upgrade to Pro
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Featured employer toggle */}
          <div className="mt-8 rounded-[var(--radius-base)] border border-stone-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-ink">Featured employer</p>
                <p className="mt-1 text-sm text-stone-600">
                  Stand out with a Featured badge across SHIFTED.{" "}
                  {!isPro && "Pro only."}
                </p>
              </div>
              <form action={toggleFeatured}>
                <button
                  className={buttonClass(
                    employer?.featured ? "primary" : "outline",
                    "sm",
                  )}
                >
                  {employer?.featured ? "Featured ✓ — turn off" : "Get featured"}
                </button>
              </form>
            </div>
          </div>

          <p className="mt-6 text-xs text-stone-400">
            Billing integration is not live. Upgrades activate features for
            preview only — no payment is taken.
          </p>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
