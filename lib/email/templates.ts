import { SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

// Daybreak-branded, bilingual (EN / ไทย) transactional emails. Kept inline and
// table-based for mail-client compatibility, matching docs/email/*.html.

type Built = { subject: string; html: string; text: string };

function layout(opts: {
  heading: string;
  body: string; // inner HTML (already escaped where needed)
  ctaLabel: string;
  ctaHref: string;
}): string {
  const url = opts.ctaHref.startsWith("http") ? opts.ctaHref : `${SITE_URL}${opts.ctaHref}`;
  return `<!doctype html><html><body style="margin:0;background:#FFF6EC;font-family:'Plus Jakarta Sans',Segoe UI,Arial,sans-serif;color:#2B1B2E">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF6EC;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px">
        <tr><td style="font-size:20px;font-weight:700;color:#2B1B2E;padding-bottom:24px">
          shifted<span style="color:#FF6B4A">↗</span>
        </td></tr>
        <tr><td style="font-size:20px;font-weight:700;line-height:1.3;padding-bottom:12px">${opts.heading}</td></tr>
        <tr><td style="font-size:15px;line-height:1.6;color:#4b3b3f;padding-bottom:24px">${opts.body}</td></tr>
        <tr><td>
          <a href="${url}" style="display:inline-block;background:#FF6B4A;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:999px">${opts.ctaLabel}</a>
        </td></tr>
        <tr><td style="font-size:12px;line-height:1.6;color:#9A7A6E;padding-top:32px;border-top:1px solid #EFE2D2;margin-top:24px">
          You're receiving this because you have a SHIFTED account.<br>
          คุณได้รับอีเมลนี้เพราะคุณมีบัญชี SHIFTED · <a href="mailto:${SUPPORT_EMAIL}" style="color:#9A7A6E">${SUPPORT_EMAIL}</a>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

/** New applicant landed on an employer's job. */
export function newApplicationEmail(jobTitle: string, jobId: string): Built {
  return {
    subject: `New applicant · ${jobTitle}`,
    html: layout({
      heading: "You have a new applicant",
      body: `Someone just applied to <strong>${jobTitle}</strong>.<br><span style="color:#9A7A6E">มีผู้สมัครใหม่สำหรับตำแหน่ง ${jobTitle}</span>`,
      ctaLabel: "Review applicant",
      ctaHref: `/employer/jobs/${jobId}`,
    }),
    text: `You have a new applicant for "${jobTitle}". Review: ${SITE_URL}/employer/jobs/${jobId}`,
  };
}

const STATUS_COPY: Record<string, { en: string; th: string }> = {
  shortlisted: { en: "You've been shortlisted", th: "คุณผ่านเข้ารอบ" },
  interviewing: { en: "You've been invited to interview", th: "คุณได้รับเชิญสัมภาษณ์" },
  offered: { en: "You've received an offer", th: "คุณได้รับข้อเสนองาน" },
  hired: { en: "You've been hired 🎉", th: "คุณได้รับการจ้างงาน 🎉" },
  rejected: { en: "An update on your application", th: "อัปเดตการสมัครของคุณ" },
};

/** Candidate's application changed status. Returns null for non-notable states. */
export function applicationStatusEmail(jobTitle: string, status: string): Built | null {
  const copy = STATUS_COPY[status];
  if (!copy) return null;
  return {
    subject: `${copy.en} · ${jobTitle}`,
    html: layout({
      heading: copy.en,
      body: `Your application for <strong>${jobTitle}</strong> has moved to <strong>${status}</strong>.<br><span style="color:#9A7A6E">${copy.th} — ${jobTitle}</span>`,
      ctaLabel: "View your applications",
      ctaHref: `/candidate`,
    }),
    text: `${copy.en}: your application for "${jobTitle}" is now ${status}. ${SITE_URL}/candidate`,
  };
}

/** New chat message for a recipient. */
export function newMessageEmail(fromName: string, conversationId: string): Built {
  return {
    subject: `New message from ${fromName}`,
    html: layout({
      heading: `New message from ${fromName}`,
      body: `You have a new message on SHIFTED.<br><span style="color:#9A7A6E">คุณมีข้อความใหม่จาก ${fromName}</span>`,
      ctaLabel: "Read message",
      ctaHref: `/messages/${conversationId}`,
    }),
    text: `New message from ${fromName}. Read: ${SITE_URL}/messages/${conversationId}`,
  };
}
