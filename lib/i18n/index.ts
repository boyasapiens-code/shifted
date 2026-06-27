import { cookies } from "next/headers";
import { en } from "./en";
import { th } from "./th";

export type Locale = "en" | "th";
export const LOCALE_COOKIE = "shifted_locale";

/** Read the locale from the cookie (server). Default English. */
export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return v === "th" ? "th" : "en";
}

export type Dict = typeof en;

/** The dictionary for the current locale. */
export async function getDict(): Promise<Dict> {
  return (await getLocale()) === "th" ? (th as Dict) : en;
}
