import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, Container, buttonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { resolveDataRequest } from "../actions";

export const metadata: Metadata = { title: "Data requests" };

type Req = {
  id: string;
  user_id: string | null;
  email: string | null;
  kind: string;
  status: string;
  created_at: string;
};

export default async function AdminDataRequestsPage() {
  const { supabase } = await requireAdmin("/admin/data-requests");
  const { data } = await supabase
    .from("data_requests")
    .select("*")
    .order("created_at", { ascending: false });
  const rows = (data as Req[] | null) ?? [];
  const open = rows.filter((r) => r.status === "open");

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-3xl py-12">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">Admin · PDPA</p>
            <a href="/admin/moderation" className="text-sm font-medium text-signal hover:underline">
              Moderation →
            </a>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Data-subject requests</h1>
          <p className="mt-1 text-stone-500">
            Export and deletion requests under the PDPA. {open.length} open. Action within 30 days.
          </p>

          {rows.length === 0 ? (
            <p className="mt-8 rounded-[var(--radius-card)] border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
              No requests.
            </p>
          ) : (
            <div className="mt-6 space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-stone-200 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone={r.kind === "delete" ? "red" : "blue"}>{r.kind}</Badge>
                      <Badge tone={r.status === "done" ? "green" : r.status === "rejected" ? "red" : undefined}>
                        {r.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-stone-500">
                      {r.email ?? r.user_id} · {new Date(r.created_at).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  {r.status === "open" && (
                    <div className="flex gap-2">
                      <form action={resolveDataRequest.bind(null, r.id, "done")}>
                        <button className={buttonClass("outline", "sm")} type="submit">Mark done</button>
                      </form>
                      <form action={resolveDataRequest.bind(null, r.id, "rejected")}>
                        <button className={buttonClass("ghost", "sm")} type="submit">Reject</button>
                      </form>
                    </div>
                  )}
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
