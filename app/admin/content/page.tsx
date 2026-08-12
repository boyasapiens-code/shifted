import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, Container, buttonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getRightsCategory, type RightsRow } from "@/lib/rights";
import type { IdeaRow, SpotlightRow } from "@/lib/marketing-content";

export const metadata: Metadata = { title: "Content" };

const statusTone = (status: string) =>
  status === "published" ? "green" : status === "legal-review" ? "amber" : "default";

export default async function AdminContentPage() {
  const { supabase } = await requireAdmin("/admin/content");

  const [{ data: rights }, { data: ideas }, { data: spotlights }] = await Promise.all([
    supabase
      .from("rights_articles")
      .select("*")
      .order("slug")
      .order("lang"),
    supabase.from("marketing_ideas").select("*").order("published_at", { ascending: false }),
    supabase.from("marketing_spotlights").select("*").order("published_at", { ascending: false }),
  ]);

  const rightsRows = (rights as RightsRow[] | null) ?? [];
  const ideaRows = (ideas as IdeaRow[] | null) ?? [];
  const spotlightRows = (spotlights as SpotlightRow[] | null) ?? [];

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-3xl py-12">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">Admin · Content</p>
            <span className="flex flex-wrap gap-4">
              <a href="/admin/verifications" className="text-sm font-medium text-signal hover:underline">
                Verifications →
              </a>
              <a href="/admin/moderation" className="text-sm font-medium text-signal hover:underline">
                Moderation →
              </a>
              <a href="/admin/metrics" className="text-sm font-medium text-signal hover:underline">
                Metrics →
              </a>
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Content</h1>
          <p className="mt-1 text-stone-500">
            Know Your Rights articles and Marketing Solutions content — editable here,
            no deploy needed. Changes go live within a few seconds.
          </p>

          {/* Rights articles */}
          <section className="mt-10">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Rights articles</h2>
              <Link href="/admin/content/rights/new" className={buttonClass("outline", "sm")}>
                + New article
              </Link>
            </div>
            {rightsRows.length > 0 ? (
              <ul className="mt-4 divide-y divide-stone-100 rounded-[var(--radius-base)] border border-stone-200">
                {rightsRows.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={a.lang === "th" ? "blue" : "default"}>{a.lang}</Badge>
                        <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                        <span className="text-xs text-stone-400">
                          {getRightsCategory(a.category)?.name ?? a.category}
                        </span>
                      </div>
                      <p className="mt-1 truncate font-medium text-ink">{a.title || a.slug}</p>
                      <p className="text-xs text-stone-400">{a.slug}</p>
                    </div>
                    <Link
                      href={`/admin/content/rights/${a.id}`}
                      className="shrink-0 text-sm font-medium text-signal hover:underline"
                    >
                      Edit →
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-[var(--radius-base)] border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
                No rights articles yet.
              </p>
            )}
          </section>

          {/* Marketing ideas */}
          <section className="mt-10">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Marketing ideas</h2>
              <Link href="/admin/content/ideas/new" className={buttonClass("outline", "sm")}>
                + New idea
              </Link>
            </div>
            {ideaRows.length > 0 ? (
              <ul className="mt-4 divide-y divide-stone-100 rounded-[var(--radius-base)] border border-stone-200">
                {ideaRows.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={i.published ? "green" : "default"}>
                          {i.published ? "published" : "draft"}
                        </Badge>
                        {i.featured && <Badge tone="amber">featured</Badge>}
                        <span className="text-xs text-stone-400">{i.category}</span>
                      </div>
                      <p className="mt-1 truncate font-medium text-ink">{i.title || i.slug}</p>
                      <p className="text-xs text-stone-400">{i.slug}</p>
                    </div>
                    <Link
                      href={`/admin/content/ideas/${i.id}`}
                      className="shrink-0 text-sm font-medium text-signal hover:underline"
                    >
                      Edit →
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-[var(--radius-base)] border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
                No ideas yet.
              </p>
            )}
          </section>

          {/* Business spotlights */}
          <section className="mt-10">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Business spotlights</h2>
              <Link href="/admin/content/spotlights/new" className={buttonClass("outline", "sm")}>
                + New spotlight
              </Link>
            </div>
            {spotlightRows.length > 0 ? (
              <ul className="mt-4 divide-y divide-stone-100 rounded-[var(--radius-base)] border border-stone-200">
                {spotlightRows.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={s.published ? "green" : "default"}>
                          {s.published ? "published" : "draft"}
                        </Badge>
                        {s.featured && <Badge tone="amber">featured</Badge>}
                        <span className="text-xs text-stone-400">{s.category}</span>
                      </div>
                      <p className="mt-1 truncate font-medium text-ink">{s.business_name || s.slug}</p>
                      <p className="text-xs text-stone-400">{s.slug}</p>
                    </div>
                    <Link
                      href={`/admin/content/spotlights/${s.id}`}
                      className="shrink-0 text-sm font-medium text-signal hover:underline"
                    >
                      Edit →
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-[var(--radius-base)] border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
                No spotlights yet.
              </p>
            )}
          </section>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
