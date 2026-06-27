"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, type Locale } from "./index";

/** Set the locale cookie and re-render the whole app in the new language. */
export async function setLocale(locale: Locale) {
  (await cookies()).set(LOCALE_COOKIE, locale === "th" ? "th" : "en", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
