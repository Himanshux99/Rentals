import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Heart } from "lucide-react";
import { AppBar } from "@/components/app/app-bar";
import { ProductCard, ProductGrid } from "@/components/app/product-card";
import { SiteFooter } from "@/components/app/site-footer";
import { parseFilters } from "@/lib/catalog";
import { listCatalog } from "@/server/services/catalog";
import { SavedSync } from "./saved-sync";

export const metadata: Metadata = { title: "Saved", robots: { index: false } };

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
      <main className="flex flex-1 flex-col gap-6 px-4 pb-8 pt-2 sm:px-8">
        <SavedSync current={raw} />
        <h1 className="flex items-center gap-2 text-3xl font-semibold sm:text-4xl">
          <Heart className="size-7 text-[var(--haldi)]" />
          {t("title")}
        </h1>
        {ordered.length === 0 ? (
          <p className="bg-card px-6 py-10 text-lg">{t("empty")}</p>
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
