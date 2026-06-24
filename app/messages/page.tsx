import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/messages");

  const { data: conversations } = await supabase
    .from("conversations")
    .select(
      "*, employer:employer_profiles(company_name), worker:candidate_profiles(full_name)",
    )
    .order("last_message_at", { ascending: false });

  // Last-message previews in one query.
  const ids = (conversations ?? []).map((c) => c.id);
  const preview = new Map<string, string>();
  if (ids.length) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("conversation_id, body, created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false });
    for (const m of msgs ?? []) {
      if (!preview.has(m.conversation_id)) preview.set(m.conversation_id, m.body);
    }
  }

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <h1 className="text-3xl font-semibold tracking-tight">Messages</h1>
          <p className="mt-1 text-stone-500">
            Conversations open once you&apos;ve applied or been hired.
          </p>

          {conversations && conversations.length > 0 ? (
            <ul className="mt-8 divide-y divide-stone-100 rounded-[var(--radius-base)] border border-stone-200">
              {conversations.map((c) => {
                const isEmployer = c.employer_id === user.id;
                const employer = Array.isArray(c.employer) ? c.employer[0] : c.employer;
                const worker = Array.isArray(c.worker) ? c.worker[0] : c.worker;
                const otherName = isEmployer
                  ? worker?.full_name ?? "Worker"
                  : employer?.company_name ?? "Employer";
                const lastRead = isEmployer
                  ? c.employer_last_read_at
                  : c.worker_last_read_at;
                const unread = !lastRead || c.last_message_at > lastRead;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/messages/${c.id}`}
                      className="flex items-center justify-between gap-3 p-4 hover:bg-stone-50"
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-medium text-ink">
                          {otherName}
                          {unread && <span className="h-2 w-2 rounded-full bg-signal" />}
                        </p>
                        <p className="truncate text-sm text-stone-500">
                          {preview.get(c.id) ?? "No messages yet"}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-stone-400">
                        {new Date(c.last_message_at).toLocaleDateString()}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-8 rounded-[var(--radius-base)] border border-dashed border-stone-300 p-10 text-center text-stone-500">
              <p className="font-medium text-ink">No conversations yet.</p>
              <p className="mt-1 text-sm">
                Apply to a job, or hire a candidate, to start one.
              </p>
            </div>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
