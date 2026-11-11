import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Store } from "lucide-react";
import { AppBar } from "@/components/app/app-bar";
import { Stripe } from "@/components/app/stripe";

// Placeholder until Phase 4 (discovery) builds the real listing page.
export default async function Home() {
  const t = await getTranslations("home");
  return (
    <>
      <AppBar />
      <main className="flex flex-1 flex-col justify-center gap-8 px-4 pb-16 sm:px-8">
        <Stripe className="h-16" bars={32} />
        <h1 className="max-w-[14ch] text-5xl font-semibold sm:text-7xl">{t("title")}</h1>
        <p className="max-w-[40ch] text-xl">{t("body")}</p>
        <Link
          href="/login"
          className="inline-flex h-14 w-fit items-center gap-2 bg-primary px-6 text-lg text-primary-foreground hover:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Store className="size-5" />
          {t("forShops")}
        </Link>
      </main>
    </>
  );
}
