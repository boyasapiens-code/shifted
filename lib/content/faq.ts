import { BOOST_PRICE, BOOST_DAYS } from "@/lib/constants";

// FAQ content, bilingual. Rendered by app/faq/page.tsx based on the cookie
// locale (same system as the app dicts). Keep answers grounded in how the
// product actually works — no promises the platform doesn't keep.

export interface FaqItem {
  q: string;
  a: string;
}
export interface FaqSection {
  title: string;
  items: FaqItem[];
}
export interface FaqContent {
  eyebrow: string;
  title: string;
  intro: string;
  contact: string;
  sections: FaqSection[];
}

export const FAQ: Record<"en" | "th", FaqContent> = {
  en: {
    eyebrow: "Help",
    title: "Frequently asked questions",
    intro:
      "Quick answers about how SHIFTED works — for workers and employers. Can't find yours? Email us and a human will reply.",
    contact: "Still stuck? Get in touch:",
    sections: [
      {
        title: "Getting started",
        items: [
          {
            q: "What is SHIFTED?",
            a: "SHIFTED is a vetted talent network for hospitality, retail, lifestyle, wellness and service businesses in Thailand. Both sides are verified — workers earn trust levels, employers earn trust layers — so hiring starts from evidence, not guesswork.",
          },
          {
            q: "How do I sign in? I don't see a password.",
            a: "We use email sign-in links (magic links): enter your email, tap the link we send you, and you're in. No password to remember or leak. Check your spam folder if the email doesn't arrive within a minute.",
          },
          {
            q: "Can one account be both a worker and an employer?",
            a: "Yes. One account can hold both a worker profile and an employer profile — switch sides any time with the Worker/Employer toggle in the header. Plenty of operators also pick up shifts; we built for that.",
          },
          {
            q: "Is SHIFTED available in Thai?",
            a: "Yes — the whole app is bilingual. Tap EN / ไทย in the header to switch languages at any time.",
          },
        ],
      },
      {
        title: "For workers",
        items: [
          {
            q: "Does SHIFTED cost anything for workers?",
            a: "No. SHIFTED is free for workers — free to join, free to apply, free to message, free to get verified. Never pay anyone to get a job on SHIFTED; if someone asks you to, report them.",
          },
          {
            q: "How do I apply for a job?",
            a: "Open a job and tap Apply. Some employers add a few quick screening questions — answer honestly; they're scored fairly and identically for everyone. You can message the employer once you've applied.",
          },
          {
            q: "What are verification levels?",
            a: "Levels 1–4 show how much of your identity and work history has been checked — from basic identity up to references from past employers. Each level is reviewed by a human. Higher levels appear higher in employer searches, and you can only be verified with evidence you choose to submit.",
          },
          {
            q: "What do employers see about me?",
            a: "Your profile, your verification level, and — only after real completed work — structured references (reliability, would-rehire). References are fixed scales, never free-text stories about you, and you always have the right to respond. You can export or delete your data any time under Your data.",
          },
        ],
      },
      {
        title: "For employers",
        items: [
          {
            q: "What does it cost to post a job?",
            a: `Posting jobs is free — we want every real role on the network. A Boost (฿${BOOST_PRICE}) promotes one job to the top of relevant searches for ${BOOST_DAYS} days, paid per use with card or PromptPay. No subscription required.`,
          },
          {
            q: "How is SHIFTED different from a job board?",
            a: "Job boards sell reach; SHIFTED is built for reliability. You see each candidate's verification level, screening-question scores, references and rehire signals from past employers — so you spend interviews on people who show up.",
          },
          {
            q: "What is employer verification?",
            a: "Employers earn trust layers 1–4 too (business registration, online presence, customer standing, peer references). Verified employers appear more trustworthy to candidates — workers can even filter jobs to verified employers only. Fake or bait posts are removed.",
          },
          {
            q: "Can my managers use the account?",
            a: "Yes. Owners can invite team members by email from the Team page. Managers can post jobs and review applicants for your organisation; billing and verification stay owner-only.",
          },
        ],
      },
      {
        title: "Trust, safety & privacy",
        items: [
          {
            q: "How do reviews work?",
            a: "Reviews are two-way and only between parties who actually worked together — an employer and a worker matched through a real engagement. No drive-by reviews, no anonymous smears. Reviews that break the rules can be reported and are moderated.",
          },
          {
            q: "How is my personal data handled?",
            a: "Under Thailand's PDPA. We collect only what the network needs, verification documents stay private to you and our reviewers, and we never sell personal data. You can view, export, correct or delete your data at any time from Your data, or email us.",
          },
          {
            q: "How do I report a problem or a scam?",
            a: "Every profile, job and review has a Report option — reports are rate-limited, human-reviewed, and acted on. For anything urgent or sensitive, email us directly and we'll respond quickly.",
          },
        ],
      },
    ],
  },
  th: {
    eyebrow: "ช่วยเหลือ",
    title: "คำถามที่พบบ่อย",
    intro:
      "คำตอบสั้น ๆ เกี่ยวกับการใช้งาน SHIFTED — สำหรับคนทำงานและนายจ้าง หากไม่พบคำตอบที่ต้องการ ส่งอีเมลหาเรา แล้วทีมงานจะตอบกลับ",
    contact: "ยังมีข้อสงสัย? ติดต่อเรา:",
    sections: [
      {
        title: "เริ่มต้นใช้งาน",
        items: [
          {
            q: "SHIFTED คืออะไร?",
            a: "SHIFTED คือเครือข่ายคนทำงานที่ผ่านการตรวจสอบ สำหรับธุรกิจโรงแรม ร้านอาหาร ค้าปลีก ไลฟ์สไตล์ เวลเนส และงานบริการในประเทศไทย ทั้งสองฝ่ายผ่านการยืนยันตัวตน — คนทำงานมีระดับความน่าเชื่อถือ นายจ้างก็เช่นกัน — การจ้างงานจึงเริ่มจากข้อมูลจริง ไม่ใช่การเดา",
          },
          {
            q: "เข้าสู่ระบบอย่างไร? ไม่เห็นมีรหัสผ่าน",
            a: "เราใช้ลิงก์เข้าสู่ระบบทางอีเมล (magic link): กรอกอีเมล กดลิงก์ที่เราส่งให้ แล้วเข้าใช้งานได้เลย ไม่ต้องจำรหัสผ่าน หากไม่ได้รับอีเมลภายในหนึ่งนาที ลองตรวจดูในโฟลเดอร์สแปม",
          },
          {
            q: "บัญชีเดียวเป็นทั้งคนทำงานและนายจ้างได้ไหม?",
            a: "ได้ บัญชีเดียวมีได้ทั้งโปรไฟล์คนทำงานและโปรไฟล์นายจ้าง — สลับฝั่งได้ตลอดเวลาด้วยปุ่ม คนทำงาน/นายจ้าง ที่ส่วนหัวของเว็บ",
          },
          {
            q: "SHIFTED มีภาษาไทยไหม?",
            a: "มี — ทั้งแอปรองรับสองภาษา กด EN / ไทย ที่ส่วนหัวเพื่อเปลี่ยนภาษาได้ตลอดเวลา",
          },
        ],
      },
      {
        title: "สำหรับคนทำงาน",
        items: [
          {
            q: "คนทำงานต้องเสียค่าใช้จ่ายไหม?",
            a: "ไม่ SHIFTED ฟรีสำหรับคนทำงานเสมอ — สมัครฟรี สมัครงานฟรี ส่งข้อความฟรี ยืนยันตัวตนฟรี อย่าจ่ายเงินให้ใครเพื่อให้ได้งานบน SHIFTED หากมีคนเรียกเงิน โปรดรายงานทันที",
          },
          {
            q: "สมัครงานอย่างไร?",
            a: "เปิดประกาศงานแล้วกด สมัคร นายจ้างบางรายมีคำถามคัดกรองสั้น ๆ — ตอบตามจริง ทุกคนถูกให้คะแนนด้วยเกณฑ์เดียวกันอย่างเป็นธรรม เมื่อสมัครแล้วคุณสามารถส่งข้อความหานายจ้างได้",
          },
          {
            q: "ระดับการยืนยันตัวตนคืออะไร?",
            a: "ระดับ 1–4 แสดงว่าตัวตนและประวัติการทำงานของคุณผ่านการตรวจสอบมากแค่ไหน — ตั้งแต่ยืนยันตัวตนพื้นฐานจนถึงหนังสือรับรองจากนายจ้างเก่า ทุกระดับตรวจโดยเจ้าหน้าที่จริง ระดับที่สูงขึ้นจะปรากฏเด่นขึ้นในการค้นหาของนายจ้าง และการยืนยันใช้เฉพาะหลักฐานที่คุณเลือกส่งเอง",
          },
          {
            q: "นายจ้างเห็นข้อมูลอะไรของฉันบ้าง?",
            a: "โปรไฟล์ ระดับการยืนยันตัวตน และ — เฉพาะหลังการทำงานจริงที่เสร็จสิ้น — ข้อมูลอ้างอิงแบบมีโครงสร้าง (ความน่าเชื่อถือ การจ้างซ้ำ) ข้อมูลอ้างอิงเป็นสเกลคงที่ ไม่ใช่ข้อความอิสระเกี่ยวกับตัวคุณ และคุณมีสิทธิ์ตอบกลับเสมอ คุณดาวน์โหลดหรือลบข้อมูลของคุณได้ตลอดเวลาที่หน้า ข้อมูลของคุณ",
          },
        ],
      },
      {
        title: "สำหรับนายจ้าง",
        items: [
          {
            q: "ลงประกาศงานเสียค่าใช้จ่ายเท่าไร?",
            a: `ลงประกาศงานฟรี — เราอยากให้ทุกตำแหน่งงานจริงอยู่บนเครือข่าย การบูสต์ (฿${BOOST_PRICE}) จะดันงานหนึ่งตำแหน่งขึ้นสู่อันดับต้นของการค้นหาที่เกี่ยวข้องเป็นเวลา ${BOOST_DAYS} วัน จ่ายต่อครั้งด้วยบัตรหรือพร้อมเพย์ ไม่ต้องสมัครสมาชิกรายเดือน`,
          },
          {
            q: "SHIFTED ต่างจากเว็บหางานทั่วไปอย่างไร?",
            a: "เว็บหางานขายจำนวนผู้เข้าถึง แต่ SHIFTED สร้างมาเพื่อความน่าเชื่อถือ คุณเห็นระดับการยืนยันตัวตน คะแนนคำถามคัดกรอง ข้อมูลอ้างอิง และสัญญาณการจ้างซ้ำจากนายจ้างเก่า — เวลาสัมภาษณ์จึงใช้กับคนที่มาทำงานจริง",
          },
          {
            q: "การยืนยันตัวตนของนายจ้างคืออะไร?",
            a: "นายจ้างก็มีระดับความน่าเชื่อถือ 1–4 เช่นกัน (ทะเบียนธุรกิจ ตัวตนออนไลน์ รีวิวจากลูกค้า การรับรองจากธุรกิจอื่น) นายจ้างที่ยืนยันแล้วน่าเชื่อถือกว่าในสายตาคนทำงาน — และคนทำงานสามารถกรองเฉพาะงานจากนายจ้างที่ยืนยันแล้วได้ ประกาศปลอมจะถูกลบ",
          },
          {
            q: "ให้ผู้จัดการใช้บัญชีร่วมได้ไหม?",
            a: "ได้ เจ้าของสามารถเชิญทีมงานทางอีเมลจากหน้า ทีม ผู้จัดการสามารถลงประกาศงานและดูผู้สมัครขององค์กรได้ ส่วนการเงินและการยืนยันตัวตนยังเป็นสิทธิ์ของเจ้าของเท่านั้น",
          },
        ],
      },
      {
        title: "ความปลอดภัยและข้อมูลส่วนบุคคล",
        items: [
          {
            q: "ระบบรีวิวทำงานอย่างไร?",
            a: "รีวิวเป็นแบบสองทาง และทำได้เฉพาะคู่ที่ทำงานร่วมกันจริงเท่านั้น ไม่มีรีวิวลอย ๆ หรือการโจมตีแบบไม่ระบุตัวตน รีวิวที่ผิดกติกาสามารถรายงานได้และมีการตรวจสอบ",
          },
          {
            q: "ข้อมูลส่วนตัวของฉันถูกดูแลอย่างไร?",
            a: "ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) เราเก็บเฉพาะข้อมูลที่จำเป็น เอกสารยืนยันตัวตนเป็นส่วนตัว เห็นได้เฉพาะคุณและผู้ตรวจสอบของเรา และเราไม่ขายข้อมูลส่วนบุคคลเด็ดขาด คุณดู ดาวน์โหลด แก้ไข หรือลบข้อมูลได้ตลอดเวลาที่หน้า ข้อมูลของคุณ หรืออีเมลหาเรา",
          },
          {
            q: "พบปัญหาหรือมิจฉาชีพ ต้องทำอย่างไร?",
            a: "ทุกโปรไฟล์ ประกาศงาน และรีวิว มีปุ่ม รายงาน — ทุกรายงานมีเจ้าหน้าที่ตรวจสอบและดำเนินการ เรื่องเร่งด่วนหรือละเอียดอ่อน อีเมลหาเราโดยตรง เราจะตอบโดยเร็ว",
          },
        ],
      },
    ],
  },
};
