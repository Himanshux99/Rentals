import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans, Noto_Serif_Devanagari, Playfair_Display } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { LanguageChooser } from "@/components/app/language-chooser";
import { LOCALE_COOKIE } from "@/i18n/request";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Playfair and Inter set the Latin text; the Noto pair backs them up for Devanagari so Hindi matches.
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["600", "700"], style: ["normal", "italic"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const notoSerif = Noto_Serif_Devanagari({ variable: "--font-noto-serif", subsets: ["devanagari"], weight: ["600", "700"] });
const notoSans = Noto_Sans({ variable: "--font-noto-sans", subsets: ["devanagari"], weight: ["400", "500", "600", "700"] });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return {
    title: { default: "Rentals", template: "%s · Rentals" },
    description: t("body"),
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    appleWebApp: { capable: true, title: "Rentals" },
    icons: { icon: "/brand/icon-rounded.png", apple: "/brand/icon-192.png" },
  };
}

const CLIENT_NAMESPACES = ["upload", "product_page", "phone", "onboarding", "product"] as const;

export const viewport: Viewport = { themeColor: "#0e3758" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, jar, messages] = await Promise.all([getLocale(), cookies(), getMessages()]);
  // only what client components translate: the rest stays on the server, keeping pages light on 3G
  const clientMessages = Object.fromEntries(CLIENT_NAMESPACES.map((ns) => [ns, messages[ns]]));
  return (
    <html lang={locale} className={`${playfair.variable} ${inter.variable} ${notoSerif.variable} ${notoSans.variable} h-full antialiased`}>
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
