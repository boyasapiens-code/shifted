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
        {/* Satoshi — the SHIFTED brand typeface (Fontshare) */}
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap"
        />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
