import type { Metadata, Viewport } from "next";
import { Eczar, Mukta } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Both faces carry Devanagari, so Hindi and English set in the same type.
const eczar = Eczar({ variable: "--font-eczar", subsets: ["latin", "devanagari"], weight: ["500", "600"] });
const mukta = Mukta({ variable: "--font-mukta", subsets: ["latin", "devanagari"], weight: ["400", "500", "600"] });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return { title: { default: "Rentals", template: "%s · Rentals" }, description: t("body") };
}

export const viewport: Viewport = { themeColor: "#472913" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${eczar.variable} ${mukta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          {children}
          <Toaster position="top-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
