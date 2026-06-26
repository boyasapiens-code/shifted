import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge, Container, Input, Select, buttonClass } from "@/components/ui";
import { requireOwner } from "@/lib/auth";
import { inviteSeat, revokeSeat } from "./actions";

export const metadata: Metadata = { title: "Team" };

type Seat = {
  id: string;
  invited_email: string | null;
  role: string;
  status: string;
  created_at: string;
};

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const { supabase, orgId } = await requireOwner("/employer/team");

  const { data } = await supabase
    .from("staff_seats")
    .select("id, invited_email, role, status, created_at")
    .eq("employer_id", orgId)
    .neq("status", "revoked")
    .order("created_at", { ascending: false });
  const seats = (data as Seat[] | null) ?? [];

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <Link href="/employer" className="text-sm text-stone-500 hover:text-ink">
            ← Dashboard
          </Link>
          <p className="eyebrow mt-3">Organization</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Team</h1>
          <p className="mt-1 text-stone-500">
            Invite managers to help run hiring for your organization. Owners
            control billing, verification, and the team; managers help with jobs
            and applicants.
          </p>

          {saved && (
            <p className="mt-4 rounded-[var(--radius-base)] bg-success/10 px-3 py-2 text-sm text-success">
              Teammate added.
            </p>
          )}

          <div className="mt-6 rounded-[var(--radius-card)] border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
            <span className="font-medium text-ink">You</span> — Owner. Full access.
          </div>

          {seats.length > 0 && (
            <ul className="mt-3 divide-y divide-stone-100 rounded-[var(--radius-card)] border border-stone-200">
              {seats.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium text-ink">{s.invited_email}</p>
                    <p className="text-xs text-stone-400">
                      Invited {new Date(s.created_at).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={s.role === "owner" ? "blue" : "default"}>{s.role}</Badge>
                    <form action={revokeSeat.bind(null, s.id)}>
                      <button className={buttonClass("ghost", "sm")} type="submit">Remove</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form action={inviteSeat} className="mt-8 rounded-[var(--radius-card)] border border-stone-200 p-5">
            <p className="font-medium text-ink">Invite a teammate</p>
            <p className="mt-1 text-xs text-stone-500">
              They get access when they sign in with this email.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Input name="email" type="email" placeholder="teammate@business.com" required className="flex-1" />
              <Select name="role" defaultValue="manager" className="w-36">
                <option value="manager">Manager</option>
                <option value="owner">Owner</option>
              </Select>
              <button className={buttonClass("primary", "md")} type="submit">Invite</button>
            </div>
          </form>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
