import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MessageCircle, Search, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppBar } from "@/components/app/app-bar";
import { SiteFooter, STATIC_PAGES } from "@/components/app/site-footer";
import { Stripe } from "@/components/app/stripe";

type Page = (typeof STATIC_PAGES)[number];
const isPage = (p: string): p is Page => (STATIC_PAGES as readonly string[]).includes(p);
const STEPS = [Search, MessageCircle, Store];

export async function generateMetadata({ params }: PageProps<"/[page]">): Promise<Metadata> {
  const { page } = await params;
  if (!isPage(page)) return {};
  const t = await getTranslations("pages");
  return { title: t(`${page}.title`) };
}

// About, How it works, For shops, Terms, Privacy (SPEC §12). Text lives in messages/{hi,en}.json.
export default async function InfoPage({ params }: PageProps<"/[page]">) {
  const { page } = await params;
  if (!isPage(page)) notFound();
  const t = await getTranslations("pages");
  const body = t.raw(`${page}.body`) as string[];

  return (
    <>
      <AppBar />
      <main className="mx-auto flex w-full max-w-[40rem] flex-1 flex-col gap-6 px-4 pb-8 pt-4">
        <Stripe className="h-4" />
        <h1 className="text-4xl font-semibold">{t(`${page}.title`)}</h1>
        {page === "how-it-works" && (
          <ol className="flex flex-col gap-4">
            {(t.raw("how-it-works.steps") as string[]).map((s, i) => {
              const Icon = STEPS[i];
              return (
                <li key={s} className="flex items-center gap-4 bg-card p-4 text-lg">
                  <span className="flex size-14 shrink-0 items-center justify-center bg-[var(--haldi)] text-[var(--haldi-ink)]">
                    <Icon className="size-7" />
                  </span>
                  <span>
                    <span className="font-semibold tabular-nums">{i + 1}. </span>
                    {s}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        {body.map((para) => (
          <p key={para} className="text-lg">
            {para}
          </p>
        ))}
        {page === "for-shops" && (
          <Button nativeButton={false} render={<Link href="/login" />} className="h-14 gap-2 text-lg">
            <Store className="size-5" />
            {t("for-shops.cta")}
          </Button>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
