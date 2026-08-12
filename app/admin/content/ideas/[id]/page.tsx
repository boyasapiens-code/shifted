import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container } from "@/components/ui";
import { IdeaForm } from "@/components/admin/IdeaForm";
import { requireAdmin } from "@/lib/auth";
import type { IdeaRow } from "@/lib/marketing-content";
import { saveIdea, deleteIdea } from "../../actions";

export const metadata: Metadata = { title: "Edit idea" };

export default async function EditIdeaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase } = await requireAdmin("/admin/content");
  const { id } = await params;
  const { error } = await searchParams;

  const { data: idea } = await supabase
    .from("marketing_ideas")
    .select("*")
    .eq("id", id)
    .single();
  if (!idea) notFound();

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <Link href="/admin/content" className="text-sm text-stone-500 hover:text-ink">
            ← Content
          </Link>
          <p className="eyebrow mt-3">Marketing idea</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{idea.title || idea.slug}</h1>

          <IdeaForm
            initial={idea as IdeaRow}
            action={saveIdea.bind(null, id)}
            deleteAction={deleteIdea.bind(null, id)}
            errorMessage={error}
          />
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
