import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container } from "@/components/ui";
import { SpotlightForm } from "@/components/admin/SpotlightForm";
import { requireAdmin } from "@/lib/auth";
import type { SpotlightRow } from "@/lib/marketing-content";
import { saveSpotlight, deleteSpotlight } from "../../actions";

export const metadata: Metadata = { title: "Edit spotlight" };

export default async function EditSpotlightPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase } = await requireAdmin("/admin/content");
  const { id } = await params;
  const { error } = await searchParams;

  const [{ data: spotlight }, { data: employers }] = await Promise.all([
    supabase.from("marketing_spotlights").select("*").eq("id", id).single(),
    supabase.from("employer_profiles").select("id, company_name").order("company_name"),
  ]);
  if (!spotlight) notFound();

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <Link href="/admin/content" className="text-sm text-stone-500 hover:text-ink">
            ← Content
          </Link>
          <p className="eyebrow mt-3">Business spotlight</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {spotlight.business_name || spotlight.slug}
          </h1>

          <SpotlightForm
            initial={spotlight as SpotlightRow}
            employers={employers ?? []}
            action={saveSpotlight.bind(null, id)}
            deleteAction={deleteSpotlight.bind(null, id)}
            errorMessage={error}
          />
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
