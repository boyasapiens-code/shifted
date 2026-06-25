import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, Container, cn } from "@/components/ui";
import { MarketingPageView, CtaLink, OutboundLink, DfyPricing } from "@/components/Booyah";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";
import {
  BOOYAH_DIY,
  BOOYAH_PROJECTS,
  BOOYAH_STATS,
  BOOYAH_STATS_FOOTNOTE,
  BOOYAH_LEVERS,
  BOOYAH_STEPS,
  BOOYAH_PROMISES,
  BOOYAH_FAQ,
  MARKETING_COPY,
  toMarketingLang,
  type BooyahPackage,
} from "@/lib/booyah";
import { submitMarketingLead } from "./actions";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const lang = toMarketingLang((await searchParams).lang);
  const t = MARKETING_COPY[lang];
  return {
    title: "Marketing Solutions — get more customers | SHIFTED × Booyah",
    description: t.heroSub,
    alternates: {
      canonical: lang === "th" ? `${SITE_URL}/marketing-solutions?lang=th` : `${SITE_URL}/marketing-solutions`,
      languages: {
        en: `${SITE_URL}/marketing-solutions`,
        th: `${SITE_URL}/marketing-solutions?lang=th`,
        "x-default": `${SITE_URL}/marketing-solutions`,
      },
    },
  };
}

const baht = (n: number) => "฿" + n.toLocaleString("en-US");

function StaticPackageCard({ p }: { p: BooyahPackage }) {
  return (
    <div className="flex flex-col rounded-[var(--radius-card)] border border-stone-200 p-6">
      <h3 className="text-lg font-semibold tracking-tight">{p.name}</h3>
      <p className="mt-0.5 text-sm text-stone-500">{p.tagline}</p>
      <div className="mt-4">
        {p.price == null ? (
          <p className="text-2xl font-black tracking-tightest text-ink">Custom quote</p>
        ) : (
          <p className="text-2xl font-black tracking-tightest text-ink">
            {baht(p.price)}
            {p.unit === "mo" && <span className="text-base font-medium text-stone-400">/mo</span>}
            {p.unit === "once" && <span className="text-base font-medium text-stone-400"> one-time</span>}
          </p>
        )}
      </div>
      <ul className="mt-4 flex-1 space-y-2 text-sm text-stone-600">
        {p.features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="text-signal">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {p.price == null ? (
        <OutboundLink destination="booking" tier={p.id} variant="outline" size="sm" className="mt-5 w-full text-center">
          {p.cta ?? "Get a quote"}
        </OutboundLink>
      ) : (
        <OutboundLink destination="site" tier={p.id} variant="outline" size="sm" className="mt-5 w-full text-center">
          Get {p.name}
        </OutboundLink>
      )}
    </div>
  );
}

export default async function MarketingSolutionsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; submitted?: string; tier?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const lang = toMarketingLang(sp.lang);
  const t = MARKETING_COPY[lang];
  const qs = lang === "th" ? "?lang=th" : "";

  // Prefill from the employer profile when logged in (attribution-friendly).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let prefill: { name: string; location: string } = { name: "", location: "" };
  if (user) {
    const { data: emp } = await supabase
      .from("employer_profiles")
      .select("company_name, location")
      .eq("id", user.id)
      .maybeSingle();
    if (emp) prefill = { name: emp.company_name ?? "", location: emp.location ?? "" };
  }

  const submitted = sp.submitted;

  return (
    <>
      <SiteHeader />
      <MarketingPageView />
      <main>
        {/* 1 — Hero */}
        <section className="relative overflow-hidden border-b border-stone-200 bg-ink text-paper">
          <div className="grid-texture pointer-events-none absolute inset-0 opacity-20 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
          <Container className="relative py-20">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-signal-bright">
                {t.eyebrow}
              </p>
              <div className="inline-flex items-center gap-1 rounded-full border border-white/20 p-0.5 text-xs">
                <Link href="/marketing-solutions" className={cn("rounded-full px-2.5 py-1 font-medium", lang === "en" ? "bg-paper text-ink" : "text-stone-300")}>EN</Link>
                <Link href="/marketing-solutions?lang=th" className={cn("rounded-full px-2.5 py-1 font-medium", lang === "th" ? "bg-paper text-ink" : "text-stone-300")}>ไทย</Link>
              </div>
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.05] tracking-tightest sm:text-6xl">
              {t.heroH1}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-stone-300">{t.heroSub}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <CtaLink href="#lead" cta="hero_free_check" variant="primary" size="md">
                {t.ctaCheck}
              </CtaLink>
              <Link
                href="#packages"
                className="inline-flex items-center rounded-[var(--radius-base)] border border-white/25 px-4 py-2 text-sm font-medium text-paper hover:bg-white/10"
              >
                {t.ctaPackages}
              </Link>
            </div>
          </Container>
        </section>

        {/* 2 — Problem */}
        <Container className="py-16">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight">{t.problemTitle}</h2>
            <p className="mt-3 text-stone-600">{t.problemBody}</p>
          </div>
        </Container>

        {/* 3 — Proof */}
        <section className="border-y border-stone-200 bg-stone-50">
          <Container className="py-14">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {BOOYAH_STATS.map((s) => (
                <div key={s.label}>
                  <p className="text-3xl font-black tracking-tightest text-ink">{s.value}</p>
                  <p className="mt-1 text-sm text-stone-500">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-stone-400">{BOOYAH_STATS_FOOTNOTE}</p>
            <p className="mt-1 text-sm font-medium text-ink">{t.proofBody}</p>
          </Container>
        </section>

        {/* 4 — What Booyah does */}
        <Container className="py-16">
          <h2 className="text-2xl font-bold tracking-tight">{t.leversTitle}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BOOYAH_LEVERS.map((l) => (
              <div key={l.title} className="rounded-[var(--radius-card)] border border-stone-200 p-5">
                <p className="font-semibold text-ink">{l.title}</p>
                <p className="mt-1 text-sm text-stone-600">{l.desc}</p>
              </div>
            ))}
          </div>
        </Container>

        {/* 5 — Packages */}
        <section id="packages" className="scroll-mt-20 border-t border-stone-200 bg-stone-50">
          <Container className="py-16">
            <h2 className="text-2xl font-bold tracking-tight">{t.packagesTitle}</h2>
            <div className="mt-6">
              <DfyPricing />
            </div>
          </Container>
        </section>

        {/* 6 — DIY */}
        <Container className="py-16">
          <h2 className="text-2xl font-bold tracking-tight">{t.diyTitle}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {BOOYAH_DIY.map((p) => (
              <StaticPackageCard key={p.id} p={p} />
            ))}
          </div>
        </Container>

        {/* 7 — One-time projects */}
        <section className="border-t border-stone-200 bg-stone-50">
          <Container className="py-16">
            <h2 className="text-2xl font-bold tracking-tight">{t.projectsTitle}</h2>
            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              {BOOYAH_PROJECTS.map((p) => (
                <StaticPackageCard key={p.id} p={p} />
              ))}
            </div>
          </Container>
        </section>

        {/* 8 — How it works */}
        <Container className="py-16">
          <h2 className="text-2xl font-bold tracking-tight">{t.howTitle}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BOOYAH_STEPS.map((s, i) => (
              <div key={s.title} className="rounded-[var(--radius-card)] border border-stone-200 p-5">
                <p className="text-sm font-black text-signal">{i + 1}</p>
                <p className="mt-1 font-semibold text-ink">{s.title}</p>
                <p className="mt-1 text-sm text-stone-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </Container>

        {/* 9 — Promises */}
        <section className="border-t border-stone-200 bg-stone-50">
          <Container className="py-16">
            <h2 className="text-2xl font-bold tracking-tight">{t.promisesTitle}</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {BOOYAH_PROMISES.map((p) => (
                <div key={p.title} className="rounded-[var(--radius-card)] border border-stone-200 bg-paper p-5">
                  <p className="font-semibold text-ink">{p.title}</p>
                  <p className="mt-1 text-sm text-stone-600">{p.desc}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* 10 — Final CTA band + lead form */}
        <section id="lead" className="scroll-mt-20 border-t border-stone-200">
          <Container className="py-16">
            <div className="grid gap-10 lg:grid-cols-2">
              <div>
                <h2 className="text-3xl font-black tracking-tightest text-ink">{t.finalTitle}</h2>
                <p className="mt-3 text-stone-600">{t.finalSub}</p>
                <p className="mt-6 text-xs text-stone-400">{t.paymentNote}</p>
              </div>

              <div className="rounded-[var(--radius-card)] border border-stone-200 p-6">
                {submitted ? (
                  <div>
                    <Badge tone="green">Sent</Badge>
                    <h3 className="mt-3 text-xl font-semibold tracking-tight">{t.successTitle}</h3>
                    <p className="mt-2 text-sm text-stone-600">{t.successBody}</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <OutboundLink destination="booking" leadRef={submitted} tier={sp.tier} variant="primary" size="md">
                        {t.successBook}
                      </OutboundLink>
                      <OutboundLink destination="freeCheck" leadRef={submitted} tier={sp.tier} variant="outline" size="md">
                        {t.successCheck}
                      </OutboundLink>
                    </div>
                  </div>
                ) : (
                  <form action={submitMarketingLead}>
                    <LeadForm t={t} prefill={prefill} error={sp.error} />
                  </form>
                )}
              </div>
            </div>
          </Container>
        </section>

        {/* 11 — FAQ */}
        <section className="border-t border-stone-200 bg-stone-50">
          <Container className="py-16">
            <h2 className="text-2xl font-bold tracking-tight">{t.faqTitle}</h2>
            <div className="mt-6 max-w-2xl divide-y divide-stone-200 rounded-[var(--radius-card)] border border-stone-200 bg-paper">
              {BOOYAH_FAQ.map((f) => (
                <details key={f.q} className="group p-5">
                  <summary className="cursor-pointer list-none font-medium text-ink marker:hidden">
                    <span className="flex items-center justify-between gap-3">
                      {f.q}
                      <span className="text-stone-400 transition group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-2 text-sm text-stone-600">{f.a}</p>
                </details>
              ))}
            </div>
            <p className="mt-8 text-center text-xs text-stone-400">
              <Link href={`/employer${qs}`} className="hover:text-ink">Hiring on SHIFTED?</Link>{" "}
              Marketing is the other half — Booyah gets customers finding you.
            </p>
          </Container>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function LeadForm({
  t,
  prefill,
  error,
}: {
  t: Record<string, string>;
  prefill: { name: string; location: string };
  error?: string;
}) {
  const field = "mt-1 w-full rounded-[var(--radius-base)] border border-stone-200 px-3 py-2 text-sm";
  return (
    <>
      <h3 className="text-xl font-semibold tracking-tight">{t.formTitle}</h3>
      {error === "missing" && (
        <p className="mt-2 rounded-[var(--radius-base)] bg-danger/10 px-3 py-2 text-sm text-danger">
          Please add your business name.
        </p>
      )}
      {error === "busy" && (
        <p className="mt-2 rounded-[var(--radius-base)] bg-danger/10 px-3 py-2 text-sm text-danger">
          Too many submissions — please try again in a little while.
        </p>
      )}
      <div className="mt-4 space-y-3">
        <div>
          <label className="text-sm font-medium text-ink">{t.formBusiness}</label>
          <input name="business_name" required defaultValue={prefill.name} className={field} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-ink">{t.formLocation}</label>
            <input name="location" defaultValue={prefill.location} className={field} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">{t.formCategory}</label>
            <input name="category" placeholder="café, bar, spa…" className={field} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-ink">{t.formContactName}</label>
            <input name="contact_name" className={field} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">{t.formContactChannel}</label>
            <input name="contact_channel" className={field} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-ink">{t.formInterest}</label>
          <select name="interest_tier" defaultValue="unsure" className={field}>
            <option value="idol">Idol — win my area</option>
            <option value="boss">Boss — own my district</option>
            <option value="legend">Legend — multi-branch</option>
            <option value="diy">DIY — Blueprint / Insider</option>
            <option value="unsure">Not sure yet</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-ink">{t.formMessage}</label>
          <textarea name="message" rows={2} className={field} />
        </div>
      </div>
      <button className="mt-4 w-full rounded-[var(--radius-base)] bg-signal px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90" type="submit">
        {t.formSubmit}
      </button>
    </>
  );
}
