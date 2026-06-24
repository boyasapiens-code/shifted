import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Accessibility" };

export default function Page() {
  return <InfoPage slug="accessibility" />;
}
