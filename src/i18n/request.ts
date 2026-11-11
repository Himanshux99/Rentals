import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export const LOCALES = ["hi", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = "locale";

// Locale lives in a cookie (not the URL) so server-rendered pages paint in the chosen language.
export default getRequestConfig(async () => {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: Locale = c === "en" ? "en" : "hi";
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default };
});
