import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppBar } from "@/components/app/app-bar";
import { Stripe } from "@/components/app/stripe";

export const metadata: Metadata = { title: "Seller account" };

export default async function SellPage() {
  const t = await getTranslations("sell");
  const points = ["p1", "p2", "p3"] as const;
  return (
    <>
      <AppBar />
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:items-center sm:pt-0">
        <section className="w-full max-w-[34rem] bg-card">
          <Stripe />
          <div className="flex flex-col gap-6 px-6 pb-8 pt-8 sm:px-10 sm:pb-10">
            <h1 className="text-[2.5rem] font-semibold sm:text-5xl">{t("title")}</h1>
            <p className="text-lg">{t("body")}</p>
            <ol className="flex list-decimal flex-col gap-3 pl-6 text-lg">
              {points.map((p) => (
                <li key={p}>{t(p)}</li>
              ))}
            </ol>
            <Button nativeButton={false} render={<Link href="/login" />} className="h-14 gap-2 text-lg">
              {t("cta")}
              <ArrowRight className="size-5" />
            </Button>
            <p className="text-base text-muted-foreground">{t("note")}</p>
          </div>
        </section>
      </main>
      <footer className="px-4 pb-6 text-center sm:px-8">
        <Link href="/" className="inline-flex min-h-12 items-center text-base underline underline-offset-4">
          {t("back")}
        </Link>
      </footer>
    </>
  );
}
