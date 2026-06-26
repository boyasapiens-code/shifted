import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, Container, Input, buttonClass } from "@/components/ui";
import { requireEmployer } from "@/lib/auth";
import { addLocation, deleteLocation, setPrimaryLocation } from "./actions";

export const metadata: Metadata = { title: "Locations" };

type Loc = { id: string; name: string; address: string | null; is_primary: boolean };

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved } = await searchParams;
  const { supabase, orgId } = await requireEmployer("/employer/locations");

  const { data } = await supabase
    .from("locations")
    .select("id, name, address, is_primary")
    .eq("employer_id", orgId)
    .order("is_primary", { ascending: false })
    .order("name");
  const locations = (data as Loc[] | null) ?? [];

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <Link href="/employer" className="text-sm text-stone-500 hover:text-ink">
            ← Dashboard
          </Link>
          <p className="eyebrow mt-3">Organization</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Locations</h1>
          <p className="mt-1 text-stone-500">
            Branches or venues for your business. Jobs can be posted per location.
          </p>

          {saved && (
            <p className="mt-4 rounded-[var(--radius-base)] bg-success/10 px-3 py-2 text-sm text-success">
              Location saved.
            </p>
          )}

          {locations.length > 0 && (
            <ul className="mt-6 divide-y divide-stone-100 rounded-[var(--radius-card)] border border-stone-200">
              {locations.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-ink">{l.name}</p>
                      {l.is_primary && <Badge tone="green">Primary</Badge>}
                    </div>
                    {l.address && <p className="text-sm text-stone-500">{l.address}</p>}
                  </div>
                  <div className="flex gap-2">
                    {!l.is_primary && (
                      <form action={setPrimaryLocation.bind(null, l.id)}>
                        <button className={buttonClass("ghost", "sm")} type="submit">Make primary</button>
                      </form>
                    )}
                    <form action={deleteLocation.bind(null, l.id)}>
                      <button className={buttonClass("ghost", "sm")} type="submit">Remove</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form action={addLocation} className="mt-8 rounded-[var(--radius-card)] border border-stone-200 p-5">
            <p className="font-medium text-ink">Add a location</p>
            <div className="mt-3 space-y-3">
              <Input name="name" placeholder="Name — e.g. Thonglor branch" required />
              <Input name="address" placeholder="Address (optional)" />
            </div>
            <button className={buttonClass("primary", "md") + " mt-3"} type="submit">
              Add location
            </button>
          </form>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
