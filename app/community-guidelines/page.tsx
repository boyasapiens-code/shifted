import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "Community Guidelines — SHIFTED",
  description:
    "How SHIFTED keeps both sides — employers and workers — treated as humans. Respect, honesty, privacy, and the right to respond. Bilingual (EN/ไทย).",
};

const ACTIONS = [
  { tag: "Allow", th: "อนุญาต", desc: "Content is fine — it publishes normally.", tone: "text-success" },
  { tag: "Soften", th: "ปรับถ้อยคำ", desc: "Borderline tone — we suggest a calmer rewrite before posting.", tone: "text-[#9a6b00]" },
  { tag: "Hold", th: "กักไว้ตรวจสอบ", desc: "Possible violation — held for human review.", tone: "text-signal" },
  { tag: "Block", th: "บล็อก", desc: "Clear violation or illegal content — not published; you're told why.", tone: "text-danger" },
];

type Section = { n: string; title: string; en: string[]; th: string };

const SECTIONS: Section[] = [
  {
    n: "1",
    title: "Why we have guidelines",
    en: [
      "A job platform only works when people trust it. Employers need to trust that workers are real and fair. Workers need to trust that employers are honest and won't punish them for telling the truth. One bad actor — a fake review, a discriminatory post, a leaked phone number — damages trust for everyone.",
      "These guidelines apply everywhere on SHIFTED: profiles, job posts, applications, reviews, ratings, endorsements, messages, and any public or member-only comment.",
    ],
    th: "แพลตฟอร์มหางานจะทำงานได้ก็ต่อเมื่อผู้คนไว้วางใจมัน การกระทำที่ไม่ดีเพียงครั้งเดียวทำลายความไว้วางใจของทุกคน กติกานี้ใช้กับทุกพื้นที่บน SHIFTED",
  },
  {
    n: "2",
    title: "The core principle: respect both sides",
    en: [
      "SHIFTED is two-sided by design. Employers deserve honest applications, reliable communication, and fair, fact-based feedback. Workers deserve honest job posts, fair treatment, privacy, and the right to speak truthfully about their experience without retaliation.",
    ],
    th: "SHIFTED เป็นสองฝ่ายโดยการออกแบบ นายจ้างสมควรได้รับใบสมัครที่ซื่อสัตย์และฟีดแบ็กตามข้อเท็จจริง คนทำงานสมควรได้รับประกาศงานที่ตรงจริง ความเป็นส่วนตัว และสิทธิ์ในการพูดความจริงโดยไม่ถูกตอบโต้",
  },
  {
    n: "3",
    title: "What's welcome",
    en: [
      "Honest, specific job descriptions with real pay, hours, and location.",
      "Truthful profiles and CVs — real skills, real experience.",
      "Factual, respectful reviews based on direct experience (\"Shifts started late three times,\" not \"the manager is an idiot\").",
      "Constructive feedback that helps the other side improve — and a worker's right to respond to any review attached to their name.",
    ],
    th: "ประกาศงานที่ตรงจริง · โปรไฟล์ที่ซื่อสัตย์ · รีวิวตามข้อเท็จจริงจากประสบการณ์ตรง · สิทธิ์ของคนทำงานในการตอบกลับรีวิวที่เกี่ยวกับชื่อของตน",
  },
  {
    n: "4",
    title: "What's not allowed",
    en: [
      "Disrespect & harassment — insults, slurs, intimidation, sexual harassment, threats (either side).",
      "Discrimination — screening on race, religion, gender, age, disability, pregnancy, or other protected traits. Requirements must be about the job, not the person.",
      "Defamation & false statements — false statements of fact that damage a reputation; opinion dressed up as fact; fake or coordinated reviews. (Criminal Code ss.326/328; Computer Crime Act s.14.)",
      "Privacy breaches — publishing phone, address, ID, salary, or photos without basis; never sensitive data: health, criminal record, religion, race, politics, union, sexual orientation. (PDPA, esp. s.26.)",
      "Fraud & misrepresentation — fake jobs, pay-to-apply scams, fake identities, demanding deposits from applicants.",
      "Retaliation — punishing a worker for honest feedback, or threatening a fake bad review to extract favours.",
      "Illegal & unsafe content — anything against Thai law, illegal labour terms, sexual services, weapons, or content harmful to minors.",
    ],
    th: "ห้าม: การคุกคาม · การเลือกปฏิบัติ · การหมิ่นประมาทและข้อมูลเท็จ · การละเมิดความเป็นส่วนตัว (โดยเฉพาะข้อมูลอ่อนไหวตาม PDPA ม.26) · การฉ้อโกง · การตอบโต้ · เนื้อหาผิดกฎหมาย — บางข้อผิดกฎหมายไทย และผู้โพสต์ต้องรับผิดเป็นการส่วนตัว",
  },
  {
    n: "5",
    title: "Reviews, ratings & endorsements — special rules",
    en: [
      "Fact, not opinion-as-fact: rate behaviour and verifiable events, not personality.",
      "First-hand only — review what you directly experienced, no hearsay.",
      "No sensitive or personal data in any review.",
      "Right to respond: anyone named can attach a response. We don't delete truthful reviews for being negative, and we don't keep reviews that are false or abusive.",
      "No structured field becomes a weapon — ratings inform, they don't blacklist. SHIFTED runs no covert blacklists.",
    ],
    th: "ใช้ข้อเท็จจริงไม่ใช่ความเห็นที่เสนอเป็นข้อเท็จจริง · รีวิวเฉพาะสิ่งที่ประสบเอง · ห้ามใส่ข้อมูลอ่อนไหว · ทุกคนที่ถูกพาดพิงมีสิทธิ์ตอบกลับ · คะแนนมีไว้เพื่อให้ข้อมูล ไม่ใช่บัญชีดำ",
  },
  {
    n: "7",
    title: "Consequences",
    en: [
      "We use a proportionate, escalating approach — we'd rather coach than ban: warning + edit request → content removed + strike → temporary suspension → permanent ban → referral to authorities where the law requires it.",
      "Legal reality: defamation, false data, privacy breaches, and illegal content can carry personal criminal and civil liability under Thai law. SHIFTED cooperates with lawful requests and removes unlawful content when properly notified.",
    ],
    th: "เราใช้แนวทางเป็นขั้นและได้สัดส่วน: เตือน → ลบเนื้อหา → พักใช้งาน → แบนถาวร → ส่งต่อเจ้าหน้าที่ ผู้โพสต์เนื้อหาผิดกฎหมายต้องรับผิดทางอาญาและแพ่งเป็นการส่วนตัวตามกฎหมายไทย",
  },
  {
    n: "8",
    title: "Reporting & appeals",
    en: [
      "See something? Report it — every post, profile, and review has a Report button, and reports are confidential.",
      "Disagree with a decision? You can appeal any block, removal, or strike, and a human reviews appeals.",
      "Named in something false? Use \"Respond\" to attach your side, and \"Report\" if it's defamatory or exposes your data.",
    ],
    th: "เห็นปัญหา? กดรายงาน (เป็นความลับ) · ไม่เห็นด้วย? อุทธรณ์ได้ มีคนตรวจ · ถูกพาดพิงด้วยข้อมูลเท็จ? ใช้ปุ่ม \"ตอบกลับ\" และ \"รายงาน\"",
  },
];

export default function CommunityGuidelinesPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="border-b border-stone-200">
          <Container className="py-14">
            <p className="eyebrow">Community Guidelines · กติกาชุมชน</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight tracking-tightest">
              People change. Businesses evolve. Careers move forward.
            </h1>
            <p className="mt-3 text-stone-600">Built by operators. Designed for humans.</p>
            <p className="mt-1 text-sm text-stone-400">Version 1.0 — June 2026. Applies to everyone on SHIFTED.</p>
            <div className="mt-6 rounded-[var(--radius-card)] border-l-2 border-ink bg-stone-50 p-5">
              <p className="text-sm text-stone-700">
                SHIFTED is a place where both sides — the people who hire and the
                people who work — are treated as humans, not commodities. Respect
                goes both ways. These rules protect that.
              </p>
              <p className="mt-2 text-sm text-stone-500">
                ทั้งสองฝ่าย — คนที่จ้างงานและคนที่ทำงาน — ถูกปฏิบัติในฐานะ &quot;คน&quot; ไม่ใช่สินค้า
                ความเคารพต้องเกิดขึ้นทั้งสองทาง
              </p>
            </div>
          </Container>
        </section>

        <Container className="max-w-2xl py-12">
          {/* The test */}
          <div className="rounded-[var(--radius-card)] bg-ink p-6 text-paper">
            <p className="eyebrow text-stone-400">The test we apply · มาตรฐานที่เราใช้</p>
            <p className="mt-2 text-lg font-medium">
              Before you post, ask: is this <em>true</em>, is it <em>fair</em>, and
              would I say it to the person&apos;s face? Yes to all three — you&apos;re
              almost certainly fine.
            </p>
            <p className="mt-2 text-sm text-stone-300">
              ก่อนโพสต์ ถามตัวเองว่า: จริงไหม ยุติธรรมไหม และกล้าพูดต่อหน้าเขาไหม?
            </p>
          </div>

          {SECTIONS.map((s) => (
            <section key={s.n} className="mt-10">
              <h2 className="text-xl font-semibold tracking-tight">
                <span className="text-stone-300">{s.n}.</span> {s.title}
              </h2>
              <ul className="mt-3 space-y-2">
                {s.en.map((line) => (
                  <li key={line} className="flex gap-2 text-stone-600">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-stone-300" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-stone-400">{s.th}</p>
            </section>
          ))}

          {/* 6 — How moderation works */}
          <section className="mt-10">
            <h2 className="text-xl font-semibold tracking-tight">
              <span className="text-stone-300">6.</span> How moderation works
            </h2>
            <p className="mt-2 text-stone-600">
              Every public comment, review, job post, and profile passes through an
              AI moderation layer that checks it against these guidelines and Thai
              law, then takes one of four actions. The AI flags and filters; bans
              and legal-risk calls are confirmed by a human, and you can always
              appeal.
            </p>
            <div className="mt-4 divide-y divide-stone-100 rounded-[var(--radius-card)] border border-stone-200">
              {ACTIONS.map((a) => (
                <div key={a.tag} className="flex items-start gap-4 p-4">
                  <span className={`w-16 shrink-0 text-sm font-semibold ${a.tone}`}>{a.tag}</span>
                  <div>
                    <p className="text-sm text-stone-700">{a.desc}</p>
                    <p className="text-xs text-stone-400">{a.th}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 9 — Note from the operators */}
          <section className="mt-12 rounded-[var(--radius-card)] border border-stone-200 p-6">
            <p className="eyebrow">A note from the operators · จากทีมผู้ก่อตั้ง</p>
            <p className="mt-2 text-stone-600">
              We&apos;ve hired, fired, trained, lost people, and rebuilt teams. We
              know feedback can sting and that both sides sometimes get it wrong.
              These guidelines aren&apos;t here to silence anyone — they&apos;re here
              so honest people, on both sides, can speak freely and be treated
              fairly. Tell the truth, stay specific, respect the person on the other
              end. That&apos;s the whole deal.
            </p>
          </section>

          <p className="mt-8 text-xs text-stone-400">
            This is a community policy, not legal advice. Thai laws referenced
            (Computer Crime Act B.E. 2550/2560, PDPA B.E. 2562, Criminal Code
            ss.326–328) are summarised in plain language and may be updated;
            consult a Thai lawyer for specific cases.
          </p>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
