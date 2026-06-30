import { createAdminClient } from "@/lib/supabase/admin";
import { emailEnabled, sendEmail } from "@/lib/email/mailer";
import {
  newApplicationEmail,
  applicationStatusEmail,
  newMessageEmail,
} from "@/lib/email/templates";

// Transactional notifications. Every function is best-effort and never throws —
// a notification must never break the action that triggered it. All are no-ops
// until SMTP is configured (emailEnabled()), so they're safe to wire in now.
//
// Recipient addresses live in auth.users (not the public profile tables), so we
// resolve them with the service-role Admin API.

async function emailFor(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

/** Tell an employer a new applicant arrived. */
export async function notifyNewApplication(
  employerId: string,
  jobTitle: string,
  jobId: string,
) {
  if (!emailEnabled()) return;
  const to = await emailFor(employerId);
  if (!to) return;
  const mail = newApplicationEmail(jobTitle, jobId);
  await sendEmail({ to, ...mail });
}

/** Tell a candidate their application moved to a new stage. */
export async function notifyApplicationStatus(
  candidateId: string,
  jobTitle: string,
  status: string,
) {
  if (!emailEnabled()) return;
  const mail = applicationStatusEmail(jobTitle, status);
  if (!mail) return; // not a notable status (e.g. withdrawn / applied)
  const to = await emailFor(candidateId);
  if (!to) return;
  await sendEmail({ to, ...mail });
}

/** Tell a conversation participant they have a new message. */
export async function notifyNewMessage(
  recipientId: string,
  fromName: string,
  conversationId: string,
) {
  if (!emailEnabled()) return;
  const to = await emailFor(recipientId);
  if (!to) return;
  const mail = newMessageEmail(fromName, conversationId);
  await sendEmail({ to, ...mail });
}
