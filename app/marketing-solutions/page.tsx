import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Marketing Solutions" };

export default function Page() {
  return <InfoPage slug="marketing-solutions" />;
}
