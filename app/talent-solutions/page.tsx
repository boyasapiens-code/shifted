import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Talent Solutions" };

export default function Page() {
  return <InfoPage slug="talent-solutions" />;
}
