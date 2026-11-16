import type { Metadata, Viewport } from "next";
import { Josefin_Sans, Noto_Sans, Noto_Serif_Devanagari } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { RouteProgress } from "@/components/feedback/route-progress";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { LanguageChooser } from "@/components/app/language-chooser";
import { LOCALE_COOKIE } from "@/i18n/request";
import { DeferredToaster } from "@/components/feedback/deferred-toaster";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import "./globals.css";

// Josefin Sans sets all Latin text; the Noto pair backs it up for Devanagari so Hindi matches.
const josefin = Josefin_Sans({ variable: "--font-josefin", subsets: ["latin"] });
const notoSerif = Noto_Serif_Devanagari({ variable: "--font-noto-serif", subsets: ["devanagari"], weight: ["600", "700"] });
const notoSans = Noto_Sans({ variable: "--font-noto-sans", subsets: ["devanagari"], weight: ["400", "500", "600", "700"] });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return {
    title: { default: "Vastra", template: "%s · Vastra" },
    description: t("body"),
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    appleWebApp: { capable: true, title: "Vastra" },
    icons: { icon: "/brand/icon-rounded.png", apple: "/brand/icon-192.png" },
  };
}

const CLIENT_NAMESPACES = ["upload", "product_page", "phone", "onboarding", "product", "feedback", "moderation"] as const;

export const viewport: Viewport = { themeColor: "#0466c8" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, jar, messages] = await Promise.all([getLocale(), cookies(), getMessages()]);
  // only what client components translate: the rest stays on the server, keeping pages light on 3G
  const clientMessages = Object.fromEntries(CLIENT_NAMESPACES.map((ns) => [ns, messages[ns]]));
  return (
    <html lang={locale} data-scroll-behavior="smooth" className={`${josefin.variable} ${notoSerif.variable} ${notoSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider messages={clientMessages}>
          <Suspense>
            <RouteProgress />
          </Suspense>
          {children}
          <LanguageChooser hasCookie={jar.has(LOCALE_COOKIE)} />
          <DeferredToaster position="top-center" />
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
        {process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_CLARITY_ID && (
          <Script id="clarity" strategy="afterInteractive">{`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${process.env.NEXT_PUBLIC_CLARITY_ID}");`}</Script>
        )}
      </body>
    </html>
  );
}
