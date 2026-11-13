import type { Metadata, Viewport } from "next";
import { Eczar, Mukta } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { LanguageChooser } from "@/components/app/language-chooser";
import { LOCALE_COOKIE } from "@/i18n/request";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Both faces carry Devanagari, so Hindi and English set in the same type.
const eczar = Eczar({ variable: "--font-eczar", subsets: ["latin", "devanagari"], weight: ["500", "600"] });
const mukta = Mukta({ variable: "--font-mukta", subsets: ["latin", "devanagari"], weight: ["400", "500", "600"] });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return {
    title: { default: "Rentals", template: "%s · Rentals" },
    description: t("body"),
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    appleWebApp: { capable: true, title: "Rentals" },
    icons: { icon: "/pwa-icon/192", apple: "/pwa-icon/192" },
  };
}

const CLIENT_NAMESPACES = ["upload", "product_page", "phone", "onboarding", "product"] as const;

export const viewport: Viewport = { themeColor: "#472913" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, jar, messages] = await Promise.all([getLocale(), cookies(), getMessages()]);
  // only what client components translate: the rest stays on the server, keeping pages light on 3G
  const clientMessages = Object.fromEntries(CLIENT_NAMESPACES.map((ns) => [ns, messages[ns]]));
  return (
    <html lang={locale} className={`${eczar.variable} ${mukta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider messages={clientMessages}>
          {children}
          <LanguageChooser hasCookie={jar.has(LOCALE_COOKIE)} />
          <Toaster position="top-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
