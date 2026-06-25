import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, Container, buttonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import type { MarketingLead, LeadStatus } from "@/lib/booyah";
import { updateMarketingLeadStatus } from "../actions";

export const metadata: Metadata = { title: "Marketing leads" };

const STATUSES: LeadStatus[] = ["new", "contacted", "won", "lost"];
const TONE: Record<LeadStatus, "green" | "blue" | "red" | undefined> = {
  new: "blue",
  contacted: undefined,
  won: "green",
  lost: "red",
};

export default async function AdminMarketingPage() {
  const { supabase } = await requireAdmin("/admin/marketing");

  const { data: leads } = await supabase
    .from("marketing_leads")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = (leads as MarketingLead[] | null) ?? [];

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="py-12">
          <p className="eyebrow">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Marketing leads</h1>
          <p className="mt-1 text-stone-500">
            Booyah lead handoffs captured on-platform. {rows.length} total. Manual follow-up.
          </p>

          {rows.length === 0 ? (
            <p className="mt-8 rounded-[var(--radius-card)] border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
              No leads yet.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {rows.map((l) => (
                <div key={l.id} className="rounded-[var(--radius-card)] border border-stone-200 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">{l.business_name}</p>
                        <Badge tone={TONE[l.status]}>{l.status}</Badge>
                        {l.interest_tier && <Badge>{l.interest_tier}</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-stone-500">
                        {l.category ?? "—"}
                        {l.location ? ` · ${l.location}` : ""}
                        {l.contact_name ? ` · ${l.contact_name}` : ""}
                        {l.contact_channel ? ` · ${l.contact_channel}` : ""}
                      </p>
                      {l.message && <p className="mt-2 text-sm text-stone-600">{l.message}</p>}
                      <p className="mt-2 text-xs text-stone-400">
                        {l.source} · {new Date(l.created_at).toLocaleDateString("en-GB")}
                        {l.employer_id ? " · linked employer" : " · logged out"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      {STATUSES.filter((s) => s !== l.status).map((s) => (
                        <form key={s} action={updateMarketingLeadStatus.bind(null, l.id, s)}>
                          <button className={buttonClass("ghost", "sm")} type="submit">
                            Mark {s}
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
