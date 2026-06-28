import Link from "next/link";
import { Logo } from "./Logo";
import { Container } from "./ui";
import { getDict } from "@/lib/i18n";
import { SUPPORT_EMAIL } from "@/lib/site";

export async function SiteFooter() {
  const t = (await getDict()).footer;
  const L = t.links;

  const COLUMNS: { title: string; links: [string, string][] }[] = [
    {
      title: t.forCandidates,
      links: [
        [L.findWork, "/jobs"],
        [L.createProfile, "/signup"],
        [L.getVerified, "/candidate/verification"],
        [L.safetyCenter, "/safety-center"],
      ],
    },
    {
      title: t.forEmployers,
      links: [
        [L.findTalent, "/talent"],
        [L.postJob, "/employer/jobs/new"],
        [L.talentSolutions, "/talent-solutions"],
        [L.smallBusiness, "/small-business"],
      ],
    },
    {
      title: t.solutions,
      links: [
        [L.marketingSolutions, "/marketing-solutions"],
        [L.salesSolutions, "/sales-solutions"],
        [L.advertising, "/advertising"],
      ],
    },
    {
      title: t.company,
      links: [
        [L.about, "/about"],
        [L.knowYourRights, "/rights"],
        [L.careers, "/careers"],
        [L.community, "/community-guidelines"],
        [L.accessibility, "/accessibility"],
      ],
    },
  ];

  const UTILITY: [string, string][] = [
    [L.privacy, "/legal"],
    [L.yourData, "/account/privacy"],
    [L.adChoices, "/ad-choices"],
    [L.mobile, "/mobile"],
  ];

  return (
    <footer className="mt-24 border-t border-stone-200 py-12">
      <Container className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm text-stone-500">{t.tagline}</p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-4 inline-block text-sm text-stone-600 hover:text-ink"
          >
            {t.getInTouch}: {SUPPORT_EMAIL}
          </a>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-8 text-sm sm:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="eyebrow mb-3">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-stone-600 hover:text-ink">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>

      <Container className="mt-10 flex flex-col gap-3 border-t border-stone-100 pt-6 text-xs text-stone-400 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} SHIFTED. {t.copyright}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {UTILITY.map(([label, href]) => (
            <Link key={href} href={href} className="hover:text-ink">
              {label}
            </Link>
          ))}
        </div>
      </Container>
    </footer>
  );
}
