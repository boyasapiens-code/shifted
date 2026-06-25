import Link from "next/link";
import { Logo } from "./Logo";
import { Container } from "./ui";

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: "For candidates",
    links: [
      ["Find work", "/jobs"],
      ["Create profile", "/signup"],
      ["Get verified", "/candidate/verification"],
      ["Safety Center", "/safety-center"],
    ],
  },
  {
    title: "For employers",
    links: [
      ["Find talent", "/talent"],
      ["Post a job", "/employer/jobs/new"],
      ["Talent Solutions", "/talent-solutions"],
      ["Small Business", "/small-business"],
    ],
  },
  {
    title: "Solutions",
    links: [
      ["Marketing Solutions", "/marketing-solutions"],
      ["Sales Solutions", "/sales-solutions"],
      ["Advertising", "/advertising"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Know Your Rights", "/rights"],
      ["Careers", "/careers"],
      ["Community Guidelines", "/community-guidelines"],
      ["Accessibility", "/accessibility"],
    ],
  },
];

const UTILITY: [string, string][] = [
  ["Privacy & Terms", "/legal"],
  ["Your data", "/account/privacy"],
  ["Ad Choices", "/ad-choices"],
  ["Mobile", "/mobile"],
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-stone-200 py-12">
      <Container className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm text-stone-500">
            The vetted talent network for Hospitality, Retail &amp; Lifestyle.
            The right shift can change everything.
          </p>
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
        <p>© {new Date().getFullYear()} SHIFTED. Built by operators, for operators.</p>
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
