import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Container, buttonClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { submitDataRequest } from "./actions";

export const metadata: Metadata = { title: "Your data & privacy" };

export default async function PrivacyCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { submitted } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/privacy");

  // Any pending requests already on file.
  const { data: requests } = await supabase
    .from("data_requests")
    .select("kind, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-2xl py-12">
          <p className="eyebrow">Your data · ข้อมูลของคุณ</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Data &amp; privacy</h1>
          <p className="mt-2 text-stone-600">
            Your rights under Thailand&apos;s PDPA — access, correct, export, and
            delete your personal data. See the full{" "}
            <Link href="/legal" className="text-signal hover:underline">Privacy Policy</Link>.
          </p>
          <p className="mt-1 text-sm text-stone-400">
            สิทธิ์ของคุณภายใต้ พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล — เข้าถึง แก้ไข ดาวน์โหลด และลบข้อมูลของคุณ
          </p>

          {submitted && (
            <p className="mt-6 rounded-[var(--radius-base)] bg-stone-100 px-3 py-2 text-sm text-ink">
              {submitted === "delete"
                ? "Deletion request received. We'll confirm by email and action it."
                : "Export request received — we'll follow up by email."}
            </p>
          )}

          {/* Access — instant self-serve export */}
          <div className="mt-8 rounded-[var(--radius-card)] border border-stone-200 p-5">
            <p className="font-medium text-ink">Download your data</p>
            <p className="mt-1 text-sm text-stone-600">
              Get a JSON file with your profile, applications, reviews you wrote,
              and your Trust Circle consents &amp; access log — right now.
            </p>
            <a href="/account/privacy/export" className={buttonClass("primary", "sm") + " mt-3 inline-block"}>
              Download (JSON)
            </a>
          </div>

          {/* Correct */}
          <div className="mt-4 rounded-[var(--radius-card)] border border-stone-200 p-5">
            <p className="font-medium text-ink">Correct your data</p>
            <p className="mt-1 text-sm text-stone-600">
              Update your profile any time from your dashboard.
            </p>
            <div className="mt-3 flex gap-2">
              <Link href="/candidate/profile" className={buttonClass("outline", "sm")}>Edit worker profile</Link>
              <Link href="/employer/profile" className={buttonClass("outline", "sm")}>Edit company</Link>
            </div>
          </div>

          {/* Delete */}
          <div className="mt-4 rounded-[var(--radius-card)] border border-stone-200 p-5">
            <p className="font-medium text-ink">Delete your account &amp; data</p>
            <p className="mt-1 text-sm text-stone-600">
              Request erasure of your personal data. Some records may be retained
              where the law requires (e.g. proof of a transaction), as explained in
              the Privacy Policy.
            </p>
            <form action={submitDataRequest.bind(null, "delete")} className="mt-3">
              <button className={buttonClass("outline", "sm")} type="submit">
                Request deletion
              </button>
            </form>
          </div>

          {requests && requests.length > 0 && (
            <div className="mt-8">
              <p className="eyebrow mb-2">Your requests</p>
              <ul className="divide-y divide-stone-100 rounded-[var(--radius-card)] border border-stone-200 text-sm">
                {requests.map((r, i) => (
                  <li key={i} className="flex items-center justify-between px-4 py-2.5">
                    <span className="capitalize text-stone-700">{r.kind}</span>
                    <span className="text-xs text-stone-400">
                      {r.status} · {new Date(r.created_at).toLocaleDateString("en-GB")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
