import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container } from "@/components/ui";
import { SITE_DOMAIN } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy & Terms" };

const UPDATED = "24 June 2026";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h3 className="mt-8 text-base font-semibold tracking-tight text-ink">{title}</h3>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-stone-600">
        {children}
      </div>
    </section>
  );
}

export default function LegalPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-16">
          <p className="eyebrow">Legal</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tightest">
            Privacy &amp; Terms
          </h1>
          <p className="mt-3 text-stone-500">
            How SHIFTED handles your data, and the terms of using the platform.
            Last updated {UPDATED}.
          </p>
          <p className="mt-4 rounded-[var(--radius-base)] bg-stone-50 px-4 py-3 text-xs text-stone-500">
            This is a plain-language policy written for our users. It is not legal
            advice; we recommend a qualified Thai lawyer review it before relying
            on it for compliance.
          </p>

          {/* ---------------- Privacy ---------------- */}
          <h2 className="mt-12 text-2xl font-semibold tracking-tight">Privacy Policy</h2>
          <p className="mt-2 text-sm text-stone-500">
            SHIFTED (&ldquo;we&rdquo;) is the data controller. We process personal
            data under Thailand&apos;s Personal Data Protection Act (PDPA).
          </p>

          <Section id="collect" title="What we collect">
            <p>
              Account details (name, email, phone, LINE ID), worker/employer
              profile information (skills, availability, work history, company
              details, photos), and — for verification — identity documents
              (ID/passport/work-permit numbers and images), reference letters,
              and business-registration documents. We also record activity such
              as applications, engagements, reviews, references, and messages.
            </p>
          </Section>
          <Section id="why" title="Why we process it (legal basis)">
            <p>
              To provide the service and the contract between you and SHIFTED
              (account, matching, messaging); with your <strong>consent</strong>{" "}
              for verification documents and sensitive identifiers; and for our
              legitimate interest in keeping the network trustworthy and safe
              (fraud prevention, reference network).
            </p>
          </Section>
          <Section id="share" title="How it's shared">
            <p>
              Your public profile and verification <em>level</em> are visible to
              other members so matching and trust work. Verification{" "}
              <em>documents</em> are private — visible only to you and our
              authorised reviewers. Employers in the shared reference network can
              see structured references about past hires. We do{" "}
              <strong>not</strong> sell your personal data or use it for
              third-party advertising.
            </p>
          </Section>
          <Section id="security" title="Storage & security">
            <p>
              Data is stored with our infrastructure provider (Supabase) and
              protected by row-level security and access controls. Verification
              documents are kept in private storage accessible only to you and
              reviewers. National ID numbers are treated as sensitive and
              minimised wherever possible.
            </p>
          </Section>
          <Section id="retention" title="Retention">
            <p>
              We keep your data while your account is active and as needed for the
              purposes above or to meet legal obligations. You can ask us to
              delete your account and associated personal data at any time.
            </p>
          </Section>
          <Section id="rights" title="Your PDPA rights">
            <p>
              You may access, correct, export, or delete your data, object to or
              restrict processing, and withdraw consent at any time. You may also
              lodge a complaint with Thailand&apos;s Personal Data Protection
              Committee (PDPC). Manage this yourself at{" "}
              <a href="/account/privacy" className="text-signal hover:underline">
                Your data
              </a>
              , or email <span className="text-ink">privacy@{SITE_DOMAIN}</span>.
            </p>
          </Section>
          <Section id="transfer" title="International transfer & cookies">
            <p>
              Data may be processed on servers outside Thailand by our providers
              under appropriate safeguards. We use only essential cookies for
              authentication — no advertising or cross-site tracking.
            </p>
          </Section>
          <Section id="children" title="Age">
            <p>SHIFTED is for people aged 18 and over.</p>
          </Section>

          {/* ---------------- Terms ---------------- */}
          <h2 className="mt-14 text-2xl font-semibold tracking-tight">Terms of Service</h2>

          <Section id="accounts" title="Accounts & eligibility">
            <p>
              You must be 18+ and provide accurate information. One account can act
              as both a worker and an employer. You&apos;re responsible for
              activity on your account and for keeping it secure.
            </p>
          </Section>
          <Section id="conduct" title="Acceptable use">
            <p>
              Be real and be fair — no fake profiles, fake companies, fake reviews,
              or misleading job posts. Follow our Community Guidelines. We may
              limit, suspend, or remove accounts that scam, harass, repeatedly
              no-show, or otherwise harm the network.
            </p>
          </Section>
          <Section id="verification" title="Verification & references">
            <p>
              Verification levels reflect evidence reviewed at a point in time;
              they are signals, not guarantees. Reviews and references may only be
              left between matched parties after a real, completed engagement, and
              must be honest and based on genuine experience.
            </p>
          </Section>
          <Section id="role" title="SHIFTED's role">
            <p>
              SHIFTED is a marketplace that connects workers and employers. We are
              not the employer, recruiter, or agency, are not party to any
              employment relationship, and do not guarantee hiring outcomes, job
              quality, or candidate performance. Employment terms are between the
              worker and the employer, who are responsible for complying with Thai
              labour law.
            </p>
          </Section>
          <Section id="plans" title="Plans & payments">
            <p>
              Workers use SHIFTED for free. Employer plans (Pro), job boosts, and
              featured placement are paid features. Billing is not yet live —
              paid features are currently provided for preview without charge.
              When billing launches, prices and terms will be shown before you
              pay.
            </p>
          </Section>
          <Section id="liability" title="Disclaimers & liability">
            <p>
              The service is provided &ldquo;as is.&rdquo; To the extent permitted
              by law, SHIFTED is not liable for indirect or consequential losses,
              or for the conduct of any member. Nothing here limits liability that
              cannot be limited under Thai law.
            </p>
          </Section>
          <Section id="law" title="Governing law & contact">
            <p>
              These terms are governed by the laws of Thailand. Questions or
              requests: <span className="text-ink">legal@{SITE_DOMAIN}</span>. We
              may update these terms; we&apos;ll post the new date here and, for
              material changes, notify you.
            </p>
          </Section>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
