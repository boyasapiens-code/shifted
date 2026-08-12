import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container } from "@/components/ui";
import { RightsArticleForm } from "@/components/admin/RightsArticleForm";
import { requireAdmin } from "@/lib/auth";
import { saveRightsArticle } from "../../actions";

export const metadata: Metadata = { title: "New rights article" };

export default async function NewRightsArticlePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin("/admin/content/rights/new");
  const { error } = await searchParams;

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <Link href="/admin/content" className="text-sm text-stone-500 hover:text-ink">
            ← Content
          </Link>
          <p className="eyebrow mt-3">Rights article</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">New article</h1>

          <RightsArticleForm
            initial={null}
            action={saveRightsArticle.bind(null, null)}
            errorMessage={error}
          />
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
