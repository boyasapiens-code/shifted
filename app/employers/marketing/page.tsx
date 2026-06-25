import { redirect } from "next/navigation";

// Spec route /employers/marketing → canonical public page (matches the repo's
// existing /marketing-solutions, sibling to /talent-solutions).
export default async function EmployersMarketingAlias({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  redirect(lang === "th" ? "/marketing-solutions?lang=th" : "/marketing-solutions");
}
