import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Community Guidelines" };

export default function Page() {
  return <InfoPage slug="community-guidelines" />;
}
