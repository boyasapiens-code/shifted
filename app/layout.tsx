import type { Metadata } from "next";
import { Anuphan } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import { getLocale } from "@/lib/i18n";
import "./globals.css";

// Anuphan (Cadson Demak) — a loopless Thai+Latin+Vietnamese family, SIL OFL.
// Replaces Plus Jakarta Sans (Latin-only, no Thai glyphs — Thai text was
// silently falling back to whatever the OS/browser substituted). next/font
// self-hosts + subsets automatically, no external Google Fonts request at
// runtime. Static weights only go to 700 (no 800/900) — see globals.css and
// NOTES.md for where display type was capped to font-bold accordingly.
const anuphan = Anuphan({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-anuphan",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SHIFTED — The vetted talent network for Hospitality, Retail & Lifestyle",
    template: "%s · SHIFTED",
  },
  description:
    "SHIFTED connects verified employers with pre-screened candidates across Thailand's hospitality, retail, and lifestyle industries. Help good people find good companies.",
  openGraph: {
    title: "SHIFTED",
    description: "The vetted talent network for Hospitality, Retail & Lifestyle.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={anuphan.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
