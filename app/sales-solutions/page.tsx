import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Sales Solutions" };

export default function Page() {
  return <InfoPage slug="sales-solutions" />;
}
