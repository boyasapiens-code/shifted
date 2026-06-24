import { notFound } from "next/navigation";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { Container } from "./ui";
import { INFO_PAGES } from "@/lib/content/pages";

/** Renders a static company / legal / solutions page from the content registry. */
export function InfoPage({ slug }: { slug: string }) {
  const page = INFO_PAGES[slug];
  if (!page) notFound();

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-16">
          <p className="eyebrow">{page.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tightest">
            {page.title}
          </h1>
          <p className="mt-4 text-lg text-stone-600">{page.intro}</p>

          <div className="mt-10 space-y-8">
            {page.sections.map((s) => (
              <section key={s.heading}>
                <h2 className="text-lg font-semibold tracking-tight">{s.heading}</h2>
                <p className="mt-2 leading-relaxed text-stone-600">{s.body}</p>
              </section>
            ))}
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
