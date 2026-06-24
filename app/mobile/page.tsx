import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Mobile" };

export default function Page() {
  return <InfoPage slug="mobile" />;
}
