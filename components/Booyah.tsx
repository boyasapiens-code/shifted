"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buttonClass, cn } from "./ui";
import {
  BOOYAH_DFY,
  BOOYAH_TERMS,
  booyahUrl,
  type BooyahDestination,
  type BooyahPackage,
} from "@/lib/booyah";

/** Fire-and-forget event beacon to the marketing event sink. */
function track(event: string, props: Record<string, unknown> = {}) {
  try {
    const body = JSON.stringify({ event, props });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/marketing/track", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/marketing/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
    }
  } catch {
    /* analytics must never break the page */
  }
}

/** Records marketing_page_viewed once on mount. */
export function MarketingPageView() {
  useEffect(() => {
    track("marketing_page_viewed");
  }, []);
  return null;
}

/** Internal CTA that logs marketing_cta_clicked before following the link. */
export function CtaLink({
  href,
  cta,
  tier,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  cta: string;
  tier?: string;
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={() => track("marketing_cta_clicked", { cta, ...(tier ? { tier } : {}) })}
      className={cn(buttonClass(variant, size), className)}
    >
      {children}
    </Link>
  );
}

/** The ONLY way to link out to Booyah: UTM-tagged + logs marketing_outbound_clicked. */
export function OutboundLink({
  destination,
  tier,
  leadRef,
  variant,
  size = "md",
  className,
  children,
}: {
  destination: BooyahDestination;
  tier?: string;
  leadRef?: string;
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
}) {
  const href = booyahUrl(destination, { ref: leadRef, tier });
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={() => track("marketing_outbound_clicked", { destination, ...(tier ? { tier } : {}) })}
      className={variant ? cn(buttonClass(variant, size), className) : className}
    >
      {children}
    </a>
  );
}

const baht = (n: number) => "฿" + n.toLocaleString("en-US");

/** Done-for-you pricing with a term toggle that applies the discount live. */
export function DfyPricing() {
  const [termIdx, setTermIdx] = useState(0);
  const term = BOOYAH_TERMS[termIdx];

  const priced = (p: BooyahPackage) =>
    p.price == null ? null : Math.round((p.price * (1 - term.discount)) / 100) * 100;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-stone-500">Commit for:</span>
        <div className="inline-flex rounded-full border border-stone-200 p-0.5 text-xs">
          {BOOYAH_TERMS.map((t, i) => (
            <button
              key={t.months}
              type="button"
              onClick={() => setTermIdx(i)}
              className={cn(
                "rounded-full px-3 py-1 font-medium transition",
                i === termIdx ? "bg-ink text-paper" : "text-stone-500 hover:text-ink",
              )}
            >
              {t.label}
              {t.discount > 0 ? ` −${t.discount * 100}%` : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {BOOYAH_DFY.map((p) => {
          const price = priced(p);
          return (
            <div
              key={p.id}
              className={cn(
                "flex flex-col rounded-[var(--radius-card)] border p-6",
                p.popular ? "border-ink ring-1 ring-ink" : "border-stone-200",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold tracking-tight">{p.name}</h3>
                {p.popular && (
                  <span className="rounded-full bg-signal/10 px-2 py-0.5 text-xs font-semibold text-signal">
                    Most popular
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-stone-500">{p.tagline}</p>

              <div className="mt-4">
                {price == null ? (
                  <p className="text-2xl font-black tracking-tightest text-ink">Custom quote</p>
                ) : (
                  <p className="text-3xl font-black tracking-tightest text-ink">
                    {baht(price)}
                    <span className="text-base font-medium text-stone-400">/mo</span>
                  </p>
                )}
                {price != null && term.discount > 0 && (
                  <p className="text-xs text-stone-400">
                    was {baht(p.price ?? 0)}/mo · billed {term.label.toLowerCase()}
                  </p>
                )}
                {p.id === "idol" && price != null && (
                  <p className="mt-1 text-xs text-stone-500">
                    works out to ~{baht(Math.round(price / 30))}/day
                  </p>
                )}
              </div>

              <ul className="mt-5 flex-1 space-y-2 text-sm text-stone-600">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-signal">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {p.id === "legend" ? (
                <OutboundLink destination="booking" tier={p.id} variant="outline" size="md" className="mt-6 w-full text-center">
                  {p.cta ?? "Book a call"}
                </OutboundLink>
              ) : (
                <CtaLink href="#lead" cta="package_select" tier={p.id} variant={p.popular ? "primary" : "outline"} size="md" className="mt-6 w-full text-center">
                  Get started
                </CtaLink>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-stone-400">
        Limited seats · cancel anytime · exclusivity = 1 client per category per zone ·
        term discounts: 3mo −5%, 6mo −10%, 12mo −15%.
      </p>
    </div>
  );
}
