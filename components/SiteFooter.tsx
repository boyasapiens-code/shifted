import Link from "next/link";
import { Logo } from "./Logo";
import { Container } from "./ui";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-stone-200 py-12">
      <Container className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm text-stone-500">
            The vetted talent network for Hospitality, Retail &amp; Lifestyle.
            The right shift can change everything.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
          <FooterCol
            title="Candidates"
            links={[
              ["Find work", "/jobs"],
              ["Create profile", "/signup"],
            ]}
          />
          <FooterCol
            title="Employers"
            links={[
              ["Find talent", "/talent"],
              ["Post a job", "/employer/jobs/new"],
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              ["How it works", "/about"],
              ["Log in", "/login"],
            ]}
          />
        </div>
      </Container>
      <Container className="mt-10 text-xs text-stone-400">
        © {new Date().getFullYear()} SHIFTED. Built by operators, for operators.
      </Container>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div>
      <p className="eyebrow mb-3">{title}</p>
      <ul className="space-y-2">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="text-stone-600 hover:text-ink">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
