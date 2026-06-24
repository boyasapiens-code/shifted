import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, Textarea, buttonClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { sendMessage } from "../actions";

export const metadata: Metadata = { title: "Conversation" };

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: conv } = await supabase
    .from("conversations")
    .select(
      "*, employer:employer_profiles(id, company_name), worker:candidate_profiles(id, full_name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!conv) notFound();

  const isEmployer = conv.employer_id === user.id;
  const employer = Array.isArray(conv.employer) ? conv.employer[0] : conv.employer;
  const worker = Array.isArray(conv.worker) ? conv.worker[0] : conv.worker;
  const otherName = isEmployer
    ? worker?.full_name ?? "Worker"
    : employer?.company_name ?? "Employer";

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  // Mark this thread read for the viewer.
  const col = isEmployer ? "employer_last_read_at" : "worker_last_read_at";
  await supabase
    .from("conversations")
    .update({ [col]: new Date().toISOString() })
    .eq("id", id);

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <Link href="/messages" className="text-sm text-stone-500 hover:text-ink">
            ← Messages
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{otherName}</h1>
          <p className="text-sm text-stone-500">
            {isEmployer ? "Candidate" : "Employer"}
          </p>

          <div className="mt-6 space-y-3">
            {messages && messages.length > 0 ? (
              messages.map((m) => {
                const mine = m.sender_id === user.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        mine
                          ? "bg-ink text-paper"
                          : "border border-stone-200 bg-paper text-ink"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.body}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="rounded-[var(--radius-base)] border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
                No messages yet. Say hello.
              </p>
            )}
          </div>

          <form action={sendMessage.bind(null, id)} className="mt-6 flex items-end gap-2">
            <Textarea
              name="body"
              required
              className="min-h-12 flex-1"
              placeholder={`Message ${otherName}…`}
              maxLength={2000}
            />
            <button type="submit" className={buttonClass("primary", "md")}>
              Send
            </button>
          </form>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
