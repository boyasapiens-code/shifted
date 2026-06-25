import Link from "next/link";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { DbButton, DbTag, DbBadge, DbInput, DbJobCard, DbWordmark } from "@/components/Daybreak";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Daybreak — design preview | SHIFTED",
  robots: { index: false, follow: false }, // preview only, keep out of search
};

const QUICK_PICKS = ["Barista", "Bartender", "Store manager", "Wellness", "Part-time"];

export default function DaybreakPreview() {
  return (
    <div className={`daybreak ${jakarta.className} min-h-screen`}>
      {/* Preview ribbon */}
      <div className="bg-[var(--db-ink)] px-4 py-2 text-center text-xs font-semibold text-white">
        Daybreak design preview — not live.{" "}
        <Link href="/" className="text-[var(--db-amber)] underline">
          Back to the current site →
        </Link>
      </div>

      {/* Top nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/daybreak">
          <DbWordmark />
        </Link>
        <nav className="hidden items-center gap-7 text-[15px] font-semibold text-[var(--db-ink)] md:flex">
          <a href="#feed" className="hover:text-[var(--db-coral)]">Find work</a>
          <a href="#employers" className="hover:text-[var(--db-coral)]">For employers</a>
          <a href="#profile" className="hover:text-[var(--db-coral)]">Stories</a>
        </nav>
        <DbButton variant="primary" href="/signup" className="px-5 py-2.5 text-sm">
          Sign up free
        </DbButton>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-8 pt-10 sm:pt-16">
        <DbTag>A new generation of job platform</DbTag>
        <h1 className="mt-5 max-w-3xl text-[40px] font-extrabold leading-[1.05] tracking-[-1.5px] text-[var(--db-ink)] sm:text-[56px]">
          Your next chapter starts here.
        </h1>
        <p className="mt-5 max-w-xl text-[17px] leading-[1.6] text-[var(--db-muted)]">
          Real jobs at places worth working for — in hospitality, retail, and
          wellness. Built by operators who&apos;ve actually hired, with trust and
          fairness on both sides.
        </p>

        {/* Search bar */}
        <div className="mt-8 max-w-2xl rounded-[20px] border border-[var(--db-line)] bg-white p-3 shadow-[0_8px_30px_rgba(43,27,46,0.07)] sm:flex sm:items-center sm:gap-2">
          <div className="flex-1">
            <DbInput label="Role" placeholder="Role — e.g. barista" className="border-transparent shadow-none focus:ring-0" />
          </div>
          <div className="mt-2 flex-1 sm:mt-0">
            <DbInput label="Location" placeholder="Location — e.g. Thonglor" className="border-transparent shadow-none focus:ring-0" />
          </div>
          <DbButton variant="primary" className="mt-2 w-full sm:mt-0 sm:w-auto">
            Search ↗
          </DbButton>
        </div>

        {/* Quick picks */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-[var(--db-muted)]">Popular:</span>
          {QUICK_PICKS.map((q) => (
            <a key={q} href="#feed">
              <DbTag soft>{q}</DbTag>
            </a>
          ))}
        </div>
      </section>

      {/* Dual intent — employer band */}
      <section id="employers" className="mx-auto mt-6 max-w-6xl px-5">
        <div className="flex flex-col items-start justify-between gap-5 rounded-[20px] bg-[var(--db-ink)] p-7 text-white sm:flex-row sm:items-center">
          <div>
            <h2 className="text-[20px] font-bold">Hire people who stay.</h2>
            <p className="mt-1 max-w-md text-[15px] text-white/70">
              Post a role, get verified, and reach pre-screened people who actually
              want the work — not just anyone with a CV.
            </p>
          </div>
          <DbButton variant="amber" href="/signup">
            For employers ↗
          </DbButton>
        </div>
      </section>

      {/* Job feed preview */}
      <section id="feed" className="mx-auto max-w-6xl px-5 py-14">
        <div className="flex items-center gap-3">
          <h2 className="text-[20px] font-bold text-[var(--db-ink)]">Fresh roles near you</h2>
          <span className="h-px flex-1 bg-[var(--db-line)]" />
        </div>

        {/* Filter row */}
        <div className="mt-5 flex flex-wrap gap-2">
          {["All", "Full-time", "Part-time", "Near me"].map((f, i) => (
            <span
              key={f}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${
                i === 0
                  ? "bg-[var(--db-coral)] text-white"
                  : "border border-[var(--db-line)] bg-white text-[var(--db-muted)]"
              }`}
            >
              {f}
            </span>
          ))}
        </div>

        <div className="mt-5 grid gap-4">
          <DbJobCard
            initial="S"
            title="Budtender"
            company="Stash BKK"
            area="Sukhumvit"
            posted="2d ago"
            tags={["Full-time", "฿18k–24k/mo", "Service charge"]}
            verified
          />
          <DbJobCard
            initial="A"
            title="Head Barista"
            company="Daybreak Coffee"
            area="Thonglor"
            posted="5h ago"
            tags={["Full-time", "฿20k–26k/mo", "Tips"]}
            boosted
          />
          <DbJobCard
            initial="G"
            title="Store Manager"
            company="Greenstead"
            area="Ari"
            posted="1d ago"
            tags={["Full-time", "฿30k–40k/mo", "Growth path"]}
            verified
          />
        </div>
      </section>

      {/* Worker profile teaser */}
      <section id="profile" className="mx-auto max-w-6xl px-5 pb-16">
        <div className="flex items-center gap-3">
          <h2 className="text-[20px] font-bold text-[var(--db-ink)]">A profile that works for the worker</h2>
          <span className="h-px flex-1 bg-[var(--db-line)]" />
        </div>

        <div className="mt-5 overflow-hidden rounded-[20px] border border-[var(--db-line)] bg-white shadow-[0_8px_30px_rgba(43,27,46,0.07)]">
          {/* Dark header */}
          <div className="bg-[var(--db-ink)] p-7 text-white">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--db-coral)] text-2xl font-extrabold text-white">
                M
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-extrabold tracking-[-0.5px]">Mali R.</h3>
                  <DbBadge>ID verified</DbBadge>
                </div>
                <p className="mt-0.5 text-[14px] text-white/70">Barista · 3 yrs · Bangkok</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Latte art", "Opening shift", "POS", "English"].map((s) => (
                <span key={s} className="rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-white">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Endorsements */}
          <div className="p-7">
            <div className="flex items-center justify-between">
              <h4 className="text-[15px] font-bold text-[var(--db-ink)]">Endorsements</h4>
              <span className="text-[12px] font-semibold text-[var(--db-muted)]">
                You control what&apos;s shown
              </span>
            </div>
            <div className="mt-3 rounded-[16px] border border-[var(--db-line)] bg-[var(--db-cream)] p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-[var(--db-ink)]">Stash BKK</span>
                <DbBadge>Verified employer</DbBadge>
              </div>
              <p className="mt-2 text-[14px] leading-[1.6] text-[var(--db-ink)]">
                Worked as barista, Jan–Nov 2025. Reliable on opens, strong with
                regulars, trained two new hires. Would re-hire.
              </p>
              <p className="mt-3 text-[12px] text-[var(--db-muted)]">
                Structured &amp; consented · no free-text negatives, no pay or
                sensitive data ·{" "}
                <span className="font-semibold text-[var(--db-coral)]">You can attach a response</span>
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <DbButton variant="primary">Invite to apply</DbButton>
              <DbButton variant="ghost">Message</DbButton>
            </div>
          </div>
        </div>
      </section>

      {/* The system — quick component swatch */}
      <section className="border-t border-[var(--db-line)] bg-white">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-[var(--db-muted)]">
            The Daybreak system
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <DbButton variant="primary">Primary</DbButton>
            <DbButton variant="secondary">Secondary</DbButton>
            <DbButton variant="ghost">Ghost</DbButton>
            <DbButton variant="amber">⚡ Boost</DbButton>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <DbTag>Tag</DbTag>
            <DbTag soft>Soft tag</DbTag>
            <DbBadge>Verified</DbBadge>
          </div>
          <p className="mt-6 max-w-xl text-[14px] text-[var(--db-muted)]">
            Warm coral &amp; cream for hope, ink for trust. Pill buttons, soft cards,
            the rising ↗. Both sides served; the worker side stays in control.
          </p>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-5 py-10 text-center text-[13px] text-[var(--db-muted)]">
        <DbWordmark />
        <p className="mt-3">Your next chapter starts here.</p>
        <p className="mt-2">
          This is a design preview.{" "}
          <Link href="/" className="font-semibold text-[var(--db-coral)] underline">
            Return to the live site
          </Link>
        </p>
      </footer>
    </div>
  );
}
