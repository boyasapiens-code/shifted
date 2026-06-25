// Deterministic pre-gate. High-precision detectors for the hard-block categories
// (sensitive data, doxxing, threats, fraud, discrimination) plus a conservative
// defamation/labour heuristic. Runs first and ALWAYS — it works with no LLM key,
// and a hard BLOCK here can never be downgraded by the model. Mirrors the
// pipeline order in SHIFTED_AI_Moderation_Engine.md §3.
import type { ModerationAction, ModerationContext, ModerationResult } from "./types";

// ── pattern banks (EN + TH) ──────────────────────────────────────────────────
const PII = {
  thai_id: /\b\d{1}[-\s]?\d{4}[-\s]?\d{5}[-\s]?\d{2}[-\s]?\d{1}\b/, // 13-digit national ID
  phone: /(?:\+?66|0)\s?\d{1,2}[-\s]?\d{3}[-\s]?\d{3,4}\b/,
  passport: /\b[A-Z]{1,2}\d{6,8}\b/,
  email: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/,
};

// PDPA s.26 — sensitive categories. Presence about a person → BLOCK on sight.
const SENSITIVE = [
  /\bhiv\b/i, /\baids\b/i, /\bcancer\b/i, /\bdisease\b/i, /\bhepatitis\b/i,
  /\bdisab(led|ility)\b/i, /\bmental illness\b/i, /\bhandicap/i,
  /\bcriminal record\b/i, /\bex[- ]?convict\b/i, /\bwent to (jail|prison)\b/i,
  /\b(muslim|christian|buddhist|jewish|hindu)\b/i,
  /\b(gay|lesbian|transgender|homosexual)\b/i,
  /\bunion member\b/i,
  /เอชไอวี|เอดส์|มะเร็ง|พิการ|ป่วยจิต|ติดคุก|ประวัติอาชญากร|ศาสนา|มุสลิม|รักร่วมเพศ|เกย์|กะเทย/,
];

const THREATS = [
  /\bi('?| wi)ll (kill|hurt|beat|destroy) (you|him|her|them)\b/i,
  /\bkill you\b/i, /\bbeat you up\b/i, /\bwatch your back\b/i,
  /ฆ่า(แก|มัน|เธอ)|ทำร้าย|เอาให้ตาย|ระวังตัวไว้/,
];

// Conservative monarchy/national-security markers → block + escalate (human confirms).
const NATSEC = [/ล้มเจ้า|จาบจ้วง|หมิ่นสถาบัน|ม\.?112/i, /\boverthrow the (monarchy|state)\b/i];

const SLURS = [
  /\b(idiot|stupid|moron|loser|trash|worthless)\b/i,
  /ไอ้(โง่|ควาย|เหี้ย|สัส|ระยำ)|โง่ฉิบหาย|กระจอก/,
];
const HARD_SLURS = [/\bf+u+c+k+\b/i, /\bbitch\b/i, /\bidiot piece\b/i, /เหี้ย|สัส|ระยำ|ไอ้สัตว์/];

const DISCRIM = [
  /\b(thai|local)s? only\b/i, /\bno (muslims?|foreigners?|blacks?|gays?)\b/i,
  /\bmen only\b/i, /\bwomen only\b/i, /\bmust be (male|female)\b/i,
  /\bunder \d{2} only\b/i, /\bno (disabled|pregnant)\b/i,
  /คนไทยเท่านั้น|ไม่รับ(ต่างชาติ|มุสลิม|คนพิการ)|รับเฉพาะ(ผู้ชาย|ผู้หญิง)|ห้ามคนพิการ/,
];

const FRAUD = [
  /\bpay .{0,12}(deposit|fee) .{0,12}(to (start|apply|join))\b/i,
  /\b(deposit|registration fee) (required|first)\b/i,
  /\bearn \d[\d,]* ?\/?\s?(day|วัน) from home\b/i,
  /\bwork from home .{0,20}\d[\d,]* ?(baht|บาท)?\/?(day|month)\b/i,
  /โอนเงิน(ก่อน|มัดจำ)|ค่าสมัครงาน|รายได้ดี.{0,10}อยู่บ้าน|งานออนไลน์.{0,10}มัดจำ/,
];

// Damaging factual accusation about a named party (defamation HOLD).
const ACCUSATION = [
  /\b(thief|fraud|scammer|crook|liar)\b/i,
  /\b(steals?|stole|stealing|cheats?|scams?) (wages|money|tips|staff|us|everyone)\b/i,
  /โกง(เงิน|ค่าจ้าง|ทิป)|ขโมย|หลอก(เงิน|ลวง)|เบี้ยว(เงิน|ค่าจ้าง)/,
];
// Opinion markers that keep something in ALLOW territory.
const OPINION = [
  /\b(i (think|feel|felt)|in my opinion|not for me|wasn'?t for me|didn'?t (enjoy|like))\b/i,
  /รู้สึกว่า|ความเห็นส่วนตัว|ไม่เหมาะกับ(เรา|ฉัน|ผม)|ไม่ค่อยชอบ/,
];

// Possible labour-law breach in a job post (e.g. long hours / no day off / low pay).
const LABOUR = [
  /\bno day off\b/i, /\b1[0-6]\s?(hours|hrs)\b/i, /ไม่มีวันหยุด|ทำงาน 1[0-6] ?ชั่วโมง/,
];

function anyMatch(text: string, bank: RegExp[]) {
  return bank.some((re) => re.test(text));
}

const sev: Record<ModerationAction, number> = { ALLOW: 0, SOFTEN: 1, HOLD: 2, BLOCK: 3 };

/** Deterministic classification. Never throws; safe with no network/LLM. */
export function runRules(text: string, ctx: ModerationContext): ModerationResult {
  const legal = new Set<string>();
  const policy = new Set<string>();
  const redact = new Set<string>();
  let escalate = false;
  // Accumulator (object property avoids over-narrowing across the bump closure).
  const acc: { action: ModerationAction; reason_en: string; reason_th: string; rewrite: string | null } = {
    action: "ALLOW",
    reason_en: "No violation detected.",
    reason_th: "ไม่พบการละเมิด",
    rewrite: null,
  };

  const bump = (a: ModerationAction, en: string, th: string) => {
    if (sev[a] >= sev[acc.action]) {
      acc.action = a;
      acc.reason_en = en;
      acc.reason_th = th;
    }
  };

  // 1 — HARD-BLOCK GATE
  if (anyMatch(text, SENSITIVE)) {
    legal.add("PDPA-26");
    redact.add("sensitive");
    bump("BLOCK", "Contains sensitive personal data (PDPA s.26).", "มีข้อมูลส่วนบุคคลอ่อนไหว (PDPA ม.26)");
  }
  if (anyMatch(text, NATSEC)) {
    legal.add("NATSEC");
    escalate = true;
    bump("BLOCK", "Possible national-security / prohibited content — escalated.", "อาจเป็นเนื้อหาต้องห้าม/ความมั่นคง — ส่งตรวจเร่งด่วน");
  }
  if (anyMatch(text, THREATS)) {
    policy.add("HARASSMENT");
    escalate = true;
    bump("BLOCK", "Contains a credible threat of harm — escalated.", "มีการข่มขู่ทำร้าย — ส่งตรวจเร่งด่วน");
  }

  // 2 — PERSONAL DATA GATE (third-party PII = doxxing)
  if (PII.thai_id.test(text)) { legal.add("PDPA-GEN"); policy.add("DOXXING"); redact.add("id_number"); bump("BLOCK", "Exposes a national ID number.", "เปิดเผยเลขบัตรประชาชน"); }
  if (PII.passport.test(text)) { legal.add("PDPA-GEN"); redact.add("passport"); bump("BLOCK", "Exposes a passport number.", "เปิดเผยเลขหนังสือเดินทาง"); }
  if (PII.phone.test(text)) { legal.add("PDPA-GEN"); policy.add("DOXXING"); redact.add("phone"); bump("BLOCK", "Exposes a personal phone number.", "เปิดเผยเบอร์โทรส่วนตัว"); }
  if (PII.email.test(text)) { legal.add("PDPA-GEN"); redact.add("email"); bump("HOLD", "Contains an email address — may expose personal data.", "มีอีเมล — อาจเปิดเผยข้อมูลส่วนบุคคล"); }

  // 5 — RESPECT / POLICY GATE (slurs/discrimination before the softer checks)
  if (anyMatch(text, HARD_SLURS)) {
    policy.add("HARASSMENT");
    bump("BLOCK", "Contains an explicit slur or abusive language.", "มีถ้อยคำหยาบคาย/เหยียดหยามอย่างชัดเจน");
  }
  if (anyMatch(text, DISCRIM)) {
    legal.add("POLICY");
    policy.add("DISCRIM");
    bump("BLOCK", "Discriminatory requirement or screening.", "ข้อกำหนด/การคัดกรองที่เลือกปฏิบัติ");
  }

  // 4 — FRAUD / LEGALITY GATE
  if (anyMatch(text, FRAUD)) {
    legal.add("CCA-14");
    policy.add("FRAUD");
    bump("BLOCK", "Matches a known scam / pay-to-apply pattern.", "เข้าข่ายหลอกลวง / จ่ายเงินเพื่อสมัคร");
  }
  if (ctx.contentType === "job_post" && anyMatch(text, LABOUR)) {
    legal.add("LABOUR");
    bump("HOLD", "Possible labour-law breach (hours / rest / pay) — ops review.", "อาจขัดกฎหมายแรงงาน (ชั่วโมง/วันหยุด/ค่าจ้าง) — ส่งตรวจ");
  }

  // 3 — DEFAMATION GATE (only if not already opinion-framed)
  if (anyMatch(text, ACCUSATION) && !anyMatch(text, OPINION)) {
    legal.add("DEF-328");
    bump("HOLD", "Damaging factual accusation about a named party with no basis shown.", "ข้อกล่าวหาเชิงข้อเท็จจริงที่ทำให้เสียหายโดยไม่มีหลักฐาน");
  }

  // soft tone (only escalates ALLOW → SOFTEN)
  if (acc.action === "ALLOW" && anyMatch(text, SLURS)) {
    policy.add("HARASSMENT");
    acc.rewrite = "Describe what happened, factually — e.g. what they did and when — without the insult.";
    bump("SOFTEN", "Disrespectful tone — consider a calmer, factual rewrite.", "โทนไม่สุภาพ — ลองเรียบเรียงใหม่ตามข้อเท็จจริง");
  }

  return {
    action: acc.action,
    confidence: acc.action === "ALLOW" ? 0.6 : 0.8,
    legal_codes: [...legal],
    policy_codes: [...policy],
    escalate,
    reason_en: acc.reason_en,
    reason_th: acc.reason_th,
    suggested_rewrite: acc.action === "SOFTEN" ? acc.rewrite : null,
    contains_named_target: Boolean(ctx.targetId),
    data_to_redact: [...redact],
    model_version: "rules-1",
  };
}

/** Redact detected PII/sensitive spans so the audit excerpt is safe to store. */
export function redactExcerpt(text: string): string {
  let out = text;
  out = out.replace(PII.thai_id, "[id]").replace(PII.passport, "[passport]");
  out = out.replace(PII.phone, "[phone]").replace(PII.email, "[email]");
  return out.length > 280 ? out.slice(0, 277) + "…" : out;
}
