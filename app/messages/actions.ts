"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ratelimit";
import { notifyNewMessage } from "@/lib/notify";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/messages");
  return { supabase, user };
}

async function findOrCreate(
  employerId: string,
  workerId: string,
  jobId: string | null,
): Promise<string> {
  const { supabase } = await requireUser();
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("employer_id", employerId)
    .eq("worker_id", workerId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ employer_id: employerId, worker_id: workerId, job_id: jobId })
    .select("id")
    .single();
  if (error || !data) redirect("/messages?error=cannot_open");
  return data!.id;
}

/** Employer opens (or resumes) a thread with a worker. */
export async function messageWorker(workerId: string, jobId?: string) {
  const { user } = await requireUser();
  const id = await findOrCreate(user.id, workerId, jobId ?? null);
  redirect(`/messages/${id}`);
}

/** Worker opens (or resumes) a thread with an employer. */
export async function messageEmployer(employerId: string, jobId?: string) {
  const { user } = await requireUser();
  const id = await findOrCreate(employerId, user.id, jobId ?? null);
  redirect(`/messages/${id}`);
}

/** Send a message into a conversation. */
export async function sendMessage(conversationId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) redirect(`/messages/${conversationId}`);

  if (!(await rateLimit(supabase, `msg:${user.id}`, 30, 60))) {
    redirect(`/messages/${conversationId}?error=rate_limited`);
  }

  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, body });
  if (error) redirect(`/messages/${conversationId}?error=send`);

  // Sending also marks the thread read for the sender.
  const { data: conv } = await supabase
    .from("conversations")
    .select("employer_id, worker_id")
    .eq("id", conversationId)
    .single();
  if (conv) {
    const isEmployer = conv.employer_id === user.id;
    const col = isEmployer ? "employer_last_read_at" : "worker_last_read_at";
    await supabase
      .from("conversations")
      .update({ [col]: new Date().toISOString() })
      .eq("id", conversationId);

    // Notify the other participant, using the sender's display name.
    const recipientId = isEmployer ? conv.worker_id : conv.employer_id;
    let fromName = "Someone";
    if (isEmployer) {
      const { data: e } = await supabase
        .from("employer_profiles")
        .select("company_name")
        .eq("id", user.id)
        .maybeSingle();
      fromName = e?.company_name ?? fromName;
    } else {
      const { data: w } = await supabase
        .from("candidate_profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      fromName = w?.full_name ?? fromName;
    }
    await notifyNewMessage(recipientId, fromName, conversationId);
  }

  revalidatePath(`/messages/${conversationId}`);
  redirect(`/messages/${conversationId}`);
}
