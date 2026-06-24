import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Careers" };

export default function Page() {
  return <InfoPage slug="careers" />;
}
