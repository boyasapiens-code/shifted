import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container } from "@/components/ui";
import { getLocale } from "@/lib/i18n";
import { FAQ } from "@/lib/content/faq";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "FAQ" };

export default async function FaqPage() {
  const locale = await getLocale();
  const t = FAQ[locale] ?? FAQ.en;

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-16">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tightest">
            {t.title}
          </h1>
          <p className="mt-4 text-lg text-stone-600">{t.intro}</p>

          <div className="mt-10 space-y-10">
            {t.sections.map((s) => (
              <section key={s.title}>
                <h2 className="text-lg font-semibold tracking-tight">{s.title}</h2>
                <div className="mt-3 divide-y divide-stone-100 rounded-[var(--radius-base)] border border-stone-200">
                  {s.items.map((item) => (
                    <details key={item.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-ink">
                        {item.q}
                        <span className="shrink-0 text-stone-400 transition-transform group-open:rotate-45">+</span>
                      </summary>
                      <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-12 text-sm text-stone-500">
            {t.contact}{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-signal hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
