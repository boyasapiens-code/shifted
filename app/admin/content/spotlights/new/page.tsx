import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container } from "@/components/ui";
import { SpotlightForm } from "@/components/admin/SpotlightForm";
import { requireAdmin } from "@/lib/auth";
import { saveSpotlight } from "../../actions";

export const metadata: Metadata = { title: "New spotlight" };

export default async function NewSpotlightPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase } = await requireAdmin("/admin/content/spotlights/new");
  const { error } = await searchParams;

  const { data: employers } = await supabase
    .from("employer_profiles")
    .select("id, company_name")
    .order("company_name");

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <Link href="/admin/content" className="text-sm text-stone-500 hover:text-ink">
            ← Content
          </Link>
          <p className="eyebrow mt-3">Business spotlight</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">New spotlight</h1>

          <SpotlightForm
            initial={null}
            employers={employers ?? []}
            action={saveSpotlight.bind(null, null)}
            errorMessage={error}
          />
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
