"use client";

import { useState } from "react";
import { useEffect } from "react";
import { buttonClass, cn } from "./ui";

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

/** Records a page_viewed event once on mount. */
export function MarketingPageView({ page }: { page: string }) {
  useEffect(() => {
    track("marketing_page_viewed", { page });
  }, [page]);
  return null;
}

/** The only way out to a partner: logs marketing_outbound_clicked, opens new tab. */
export function OutboundLink({
  href,
  label,
  variant,
  size = "md",
  className,
  children,
}: {
  href: string;
  label: string;
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("marketing_outbound_clicked", { destination: label })}
      className={variant ? cn(buttonClass(variant, size), className) : className}
    >
      {children}
    </a>
  );
}

/** Share row — LINE first (primary channel in Thailand), then FB / X / copy. */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent(url);
  const encT = encodeURIComponent(title);
  const links = [
    { label: "LINE", href: `https://social-plugins.line.me/lineit/share?url=${enc}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc}` },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${enc}&text=${encT}` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-stone-400">Share</span>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("marketing_shared", { channel: l.label })}
          className="rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 hover:text-ink"
        >
          {l.label}
        </a>
      ))}
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
          track("marketing_shared", { channel: "copy" });
        }}
        className="rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 hover:text-ink"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
