import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Safety Center" };

export default function Page() {
  return <InfoPage slug="safety-center" />;
}
