import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container } from "@/components/ui";
import { RightsArticleForm } from "@/components/admin/RightsArticleForm";
import { requireAdmin } from "@/lib/auth";
import type { RightsRow } from "@/lib/rights";
import { saveRightsArticle, deleteRightsArticle } from "../../actions";

export const metadata: Metadata = { title: "Edit rights article" };

export default async function EditRightsArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase } = await requireAdmin("/admin/content");
  const { id } = await params;
  const { error } = await searchParams;

  const { data: article } = await supabase
    .from("rights_articles")
    .select("*")
    .eq("id", id)
    .single();
  if (!article) notFound();

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <Link href="/admin/content" className="text-sm text-stone-500 hover:text-ink">
            ← Content
          </Link>
          <p className="eyebrow mt-3">Rights article · {article.lang}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{article.title || article.slug}</h1>

          <RightsArticleForm
            initial={article as RightsRow}
            action={saveRightsArticle.bind(null, id)}
            deleteAction={deleteRightsArticle.bind(null, id)}
            errorMessage={error}
          />
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
