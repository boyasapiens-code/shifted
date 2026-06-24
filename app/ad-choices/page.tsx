import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Ad Choices" };

export default function Page() {
  return <InfoPage slug="ad-choices" />;
}
