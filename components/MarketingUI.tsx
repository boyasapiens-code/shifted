import Link from "next/link";
import { Badge, buttonClass } from "./ui";
import { OutboundLink } from "./Marketing";
import { PARTNERS, partnerUrl, SHIFTED_SOLUTION } from "@/lib/marketing";
import { SPOTLIGHT_CATEGORIES, type Idea, type Spotlight, type CtaType } from "@/lib/marketing-content";
import { submitFeatured, submitEnquiry, subscribe } from "@/app/marketing-solutions/actions";

const MS = "/marketing-solutions";
const stripHtml = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const catLabel = (v: string) => SPOTLIGHT_CATEGORIES.find((c) => c.value === v)?.label ?? v;
const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

// ── Cards ────────────────────────────────────────────────────────────────────
export function PillarCard({
  title,
  desc,
  href,
  cta,
}: {
  title: string;
  desc: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="card-interactive flex flex-col rounded-[var(--radius-card)] border border-stone-200 p-6"
    >
      <h3 className="text-lg font-semibold tracking-tight text-ink">{title}</h3>
      <p className="mt-2 flex-1 text-sm text-stone-600">{desc}</p>
      <span className="mt-4 text-sm font-medium text-signal">{cta} →</span>
    </Link>
  );
}

export function ArticleCard({ idea }: { idea: Idea }) {
  return (
    <Link
      href={`${MS}/ideas/${idea.slug}`}
      className="card-interactive flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-stone-200"
    >
      <div className="flex aspect-[16/9] items-center justify-center bg-stone-100">
        <span className="text-xs uppercase tracking-widest text-stone-400">{idea.category}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <Badge>{idea.category}</Badge>
        <h3 className="mt-2 font-semibold tracking-tight text-ink">{idea.title}</h3>
        <p className="mt-1 flex-1 text-sm text-stone-600">{idea.excerpt}</p>
        <p className="mt-3 text-xs text-stone-400">
          {idea.author.name} · {idea.readTime} min · {fmtDate(idea.publishedAt)}
        </p>
      </div>
    </Link>
  );
}

export function SpotlightCard({ spotlight }: { spotlight: Spotlight }) {
  const hook = stripHtml(spotlight.sections.story).slice(0, 110);
  return (
    <Link
      href={`${MS}/spotlights/${spotlight.slug}`}
      className="card-interactive flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-stone-200"
    >
      <div className="flex aspect-[16/9] items-center justify-center bg-ink text-paper">
        <span className="text-lg font-black tracking-tightest">{spotlight.businessName}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{catLabel(spotlight.category)}</Badge>
          {spotlight.area && <span className="text-xs text-stone-400">{spotlight.area}</span>}
        </div>
        <h3 className="mt-2 font-semibold tracking-tight text-ink">{spotlight.businessName}</h3>
        <p className="mt-1 flex-1 text-sm text-stone-600">{hook}…</p>
      </div>
    </Link>
  );
}

/** Contextual end-of-post CTA (§3.6). */
export function CtaBlock({ ctaType }: { ctaType: CtaType }) {
  if (ctaType === "booyah") {
    const booyah = PARTNERS.find((p) => p.slug === "booyah")!;
    return (
      <div className="mt-10 rounded-[var(--radius-card)] border border-stone-200 bg-stone-50 p-6">
        <p className="font-medium text-ink">Want this done for you?</p>
        <p className="mt-1 text-sm text-stone-600">{booyah.description}</p>
        <OutboundLink href={partnerUrl(booyah)} label="booyah" variant="primary" size="sm" className="mt-4 inline-block">
          {booyah.ctaLabel}
        </OutboundLink>
      </div>
    );
  }
  if (ctaType === "shifted-hire") {
    return (
      <div className="mt-10 rounded-[var(--radius-card)] border border-stone-200 bg-stone-50 p-6">
        <p className="font-medium text-ink">Hiring for this?</p>
        <p className="mt-1 text-sm text-stone-600">{SHIFTED_SOLUTION.description}</p>
        <Link href={SHIFTED_SOLUTION.href} className={buttonClass("primary", "sm") + " mt-4 inline-block"}>
          {SHIFTED_SOLUTION.ctaLabel}
        </Link>
      </div>
    );
  }
  return (
    <div className="mt-10 rounded-[var(--radius-card)] border border-stone-200 bg-stone-50 p-6">
      <p className="font-medium text-ink">Know what you need but not the time to do it?</p>
      <p className="mt-1 text-sm text-stone-600">SHIFTED and our partners can help.</p>
      <Link href={`${MS}/solutions`} className={buttonClass("primary", "sm") + " mt-4 inline-block"}>
        See solutions →
      </Link>
    </div>
  );
}

// ── Forms ────────────────────────────────────────────────────────────────────
const field = "mt-1 w-full rounded-[var(--radius-base)] border border-stone-200 px-3 py-2 text-sm";

export function FeaturedForm() {
  return (
    <form action={submitFeatured} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="text-sm font-medium text-ink">Business name</label>
        <input name="business_name" required className={field} />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Category</label>
        <select name="category" className={field} defaultValue="">
          <option value="">Select…</option>
          {SPOTLIGHT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Area</label>
        <input name="area" placeholder="e.g. Thonglor, Bangkok" className={field} />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Your name</label>
        <input name="contact_name" className={field} />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Contact (LINE / phone / email)</label>
        <input name="contact_channel" className={field} />
      </div>
      <div className="sm:col-span-2">
        <label className="text-sm font-medium text-ink">One line about your business</label>
        <input name="pitch" className={field} />
      </div>
      <div className="sm:col-span-2">
        <button className={buttonClass("primary", "md")} type="submit">Get featured →</button>
      </div>
    </form>
  );
}

export function EnquiryForm() {
  return (
    <form action={submitEnquiry} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="text-sm font-medium text-ink">Business name</label>
        <input name="business_name" required className={field} />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Your name</label>
        <input name="contact_name" className={field} />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">What do you need?</label>
        <select name="need" className={field} defaultValue="hiring">
          <option value="hiring">Hiring</option>
          <option value="visibility">Local visibility / marketing</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Contact (LINE / phone / email)</label>
        <input name="contact_channel" className={field} />
      </div>
      <div className="sm:col-span-2">
        <label className="text-sm font-medium text-ink">Message</label>
        <textarea name="message" rows={3} className={field} />
      </div>
      <div className="sm:col-span-2">
        <button className={buttonClass("primary", "md")} type="submit">Send enquiry</button>
      </div>
    </form>
  );
}

export function SubscribeForm({ returnTo }: { returnTo: string }) {
  return (
    <form action={subscribe} className="flex flex-wrap gap-2">
      <input type="hidden" name="return_to" value={returnTo} />
      <input
        name="email"
        type="email"
        required
        placeholder="you@business.com"
        className="flex-1 rounded-[var(--radius-base)] border border-stone-200 px-3 py-2 text-sm"
      />
      <button className={buttonClass("primary", "md")} type="submit">Subscribe</button>
    </form>
  );
}
