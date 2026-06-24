import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Small Business" };

export default function Page() {
  return <InfoPage slug="small-business" />;
}
