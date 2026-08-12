import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, Container, buttonClass } from "@/components/ui";
import { requireEmployer } from "@/lib/auth";
import { PLANS, PLAN_NAME, isPaidPlan, BOOST_PRICE, BOOST_DAYS, OUTCOME_PRICING } from "@/lib/constants";
import { stripeEnabled } from "@/lib/payments/stripe";
import type { PlanTier } from "@/lib/types";
import { upgradeTo, downgradeToFree, toggleFeatured } from "./actions";

export const metadata: Metadata = { title: "Plan & billing" };

const PAYMENT_ERRORS: Record<string, string> = {
  "payment-init": "Couldn’t start that — please try again.",
  stripe: "Payment couldn’t be set up. No charge was made — please try again.",
  "stripe-session": "Stripe didn’t return a checkout link. No charge was made.",
  "stripe-cancel": "Couldn’t cancel your subscription — please try again or contact us.",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{
    gate?: string;
    upgraded?: string;
    downgraded?: string;
    preview?: string;
    error?: string;
  }>;
}) {
  const { gate, upgraded, downgraded, preview, error } = await searchParams;
  const stripeLive = stripeEnabled();
  const boostLive = stripeLive;
  const { supabase, user } = await requireEmployer("/employer/billing");

  const { data: employer } = await supabase
    .from("employer_profiles")
    .select("plan, featured")
    .eq("id", user.id)
    .single();
  const plan = (employer?.plan ?? "free") as PlanTier;
  const isPaid = isPaidPlan(plan);

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
            <Badge tone={isPaid ? "green" : "default"}>{PLAN_NAME[plan]}</Badge>
          </div>
          <p className="mt-1 text-stone-500">
            Free for workers, always. Employers upgrade for reach.
          </p>

          {upgraded && (
            <p className="mt-4 rounded-[var(--radius-base)] bg-success/10 px-3 py-2 text-sm text-success">
              {preview || !stripeLive
                ? "You're upgraded. (Billing isn't live yet — this activated the plan for preview, no charge was made.)"
                : "You're upgraded — your subscription is active and will renew monthly until you cancel."}
            </p>
          )}
          {downgraded && (
            <p className="mt-4 rounded-[var(--radius-base)] bg-success/10 px-3 py-2 text-sm text-success">
              Your subscription has been canceled — this can take a few
              moments to reflect below.
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
          {error && PAYMENT_ERRORS[error] && (
            <p className="mt-4 rounded-[var(--radius-base)] bg-red-50 px-3 py-2 text-sm text-red-700">
              {PAYMENT_ERRORS[error]}
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

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {PLANS.map((p) => {
              const current = plan === p.key;
              const featured = p.key === "pro";
              return (
                <div
                  key={p.key}
                  className={`rounded-[var(--radius-card)] p-6 ${
                    featured ? "border-2 border-signal" : "border border-stone-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className={`eyebrow ${featured ? "text-signal" : ""}`}>{p.name}</p>
                    {featured && <Badge tone="blue">Most popular</Badge>}
                  </div>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">
                    ฿{p.price.toLocaleString("en-US")}
                    {p.price > 0 && (
                      <span className="text-base font-normal text-stone-500">/mo</span>
                    )}
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-stone-600">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className={featured ? "text-signal" : "text-stone-400"}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  {current ? (
                    <p className="mt-5 text-sm font-medium text-signal">Your current plan</p>
                  ) : p.key === "free" ? (
                    <form action={downgradeToFree} className="mt-5">
                      <button className={buttonClass("outline", "sm", "w-full")}>
                        Downgrade
                      </button>
                    </form>
                  ) : (
                    <form action={upgradeTo.bind(null, p.key as "pro" | "growth")} className="mt-5">
                      <button className={buttonClass(featured ? "primary" : "outline", "md", "w-full")}>
                        Choose {p.name}
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add-ons: boost (pay-per-use) + featured */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[var(--radius-base)] border border-stone-200 p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-ink">Boost a job</p>
                <span className="text-sm font-semibold text-ink">
                  ฿{BOOST_PRICE}/boost
                </span>
              </div>
              <p className="mt-1 text-sm text-stone-600">
                Pay-per-use — promote any role to the top of search for{" "}
                {BOOST_DAYS} days. No subscription needed. Boost from a job&apos;s
                page.
              </p>
              <Badge tone={boostLive ? "green" : "amber"} className="mt-3">
                {boostLive ? "Live — card & PromptPay" : "Preview — no charge yet"}
              </Badge>
            </div>

            <div className="rounded-[var(--radius-base)] border border-stone-200 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">Featured employer</p>
                  <p className="mt-1 text-sm text-stone-600">
                    Featured badge across SHIFTED. {!isPaid && "Paid plans only."}
                  </p>
                </div>
                <form action={toggleFeatured}>
                  <button className={buttonClass(employer?.featured ? "primary" : "outline", "sm")}>
                    {employer?.featured ? "On — turn off" : "Get featured"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          <p className="mt-6 text-xs text-stone-400">
            {stripeLive
              ? "Job boosts and plan subscriptions are both charged through Stripe (card & PromptPay). Subscriptions renew monthly until canceled."
              : "Billing runs in preview: boosts and upgrades activate features without taking payment. Add Stripe keys to charge for real."}
          </p>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
