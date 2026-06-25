import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Plus Jakarta Sans — the SHIFTED "Daybreak" brand typeface */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
