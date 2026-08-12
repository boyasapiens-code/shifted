import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container } from "@/components/ui";
import { IdeaForm } from "@/components/admin/IdeaForm";
import { requireAdmin } from "@/lib/auth";
import { saveIdea } from "../../actions";

export const metadata: Metadata = { title: "New idea" };

export default async function NewIdeaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin("/admin/content/ideas/new");
  const { error } = await searchParams;

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <Link href="/admin/content" className="text-sm text-stone-500 hover:text-ink">
            ← Content
          </Link>
          <p className="eyebrow mt-3">Marketing idea</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">New idea</h1>

          <IdeaForm initial={null} action={saveIdea.bind(null, null)} errorMessage={error} />
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
