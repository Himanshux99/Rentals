import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { AppBar } from "@/components/app/app-bar";
import { ProductCard, ProductGrid } from "@/components/app/product-card";
import { SiteFooter } from "@/components/app/site-footer";
import { parseFilters } from "@/lib/catalog";
import { listCatalog } from "@/server/services/catalog";
import { SavedSync } from "./saved-sync";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("saved"))("title"), robots: { index: false } };
}

// Saved codes live in localStorage; SavedSync copies them into ?codes= so the server can render the cards.
export default async function SavedPage({ searchParams }: PageProps<"/saved">) {
  const sp = await searchParams;
  const raw = typeof sp.codes === "string" ? sp.codes : "";
  const codes = raw.split(",").filter((c) => /^R\d{1,9}$/.test(c)).slice(0, 100);
  const [t, { items }] = await Promise.all([
    getTranslations("saved"),
    codes.length ? listCatalog({ ...parseFilters({}), sort: "newest", page: 5 }, { codes }) : Promise.resolve({ items: [] }),
  ]);
  const ordered = codes.map((c) => items.find((p) => p.code === c)).filter((p) => !!p);

  return (
    <>
      <AppBar />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-8 pt-6 sm:px-8">
        <SavedSync current={raw} />
        <h1 className="flex items-center gap-2 text-3xl font-semibold sm:text-4xl">
          <Heart className="size-7 text-[var(--gold)]" />
          {t("title")}
        </h1>
        {ordered.length === 0 ? (
          <section className="flex flex-col items-start gap-4 bg-card px-6 py-10">
            <p className="text-lg">{t("empty")}</p>
            <Button nativeButton={false} render={<Link href="/" />} className="h-12 text-base">
              {t("browse")}
            </Button>
          </section>
        ) : (
          <ProductGrid>
            {ordered.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </ProductGrid>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
