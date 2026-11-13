import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowDownUp, Search, SearchX, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { filterHref, LIST_KEYS, SORTS, toggle, type Filters, type ListKey } from "@/lib/catalog";
import { listCatalog, listFacets, PAGE_SIZE } from "@/server/services/catalog";
import { ChipLink } from "./chip-link";
import { ProductCard, ProductGrid } from "./product-card";

type Opt = { slug: string; nameEn: string; nameHi: string };

/** Search, quick chips, filter sheet, sort, grid and "Load more" (SPEC §7). Everything lives in the URL. */
export async function CatalogListing({ path, filters: f, shopId }: { path: string; filters: Filters; shopId?: string }) {
  const [t, locale, facets, { items, total }] = await Promise.all([
    getTranslations("catalog"),
    getLocale(),
    listFacets(),
    listCatalog(f, { shopId }),
  ]);
  const name = (o: Opt) => (locale === "hi" ? o.nameHi : o.nameEn);
  const href = (change: Partial<Filters>) => filterHref(path, f, change);
  const row = (key: ListKey, list: Opt[]) =>
    list.map((o) => (
      <ChipLink key={o.slug} href={href({ [key]: toggle(f[key], o.slug) })} active={f[key].includes(o.slug)}>
        {name(o)}
      </ChipLink>
    ));
  const panelCount = (["size", "age", "area"] as const).reduce((n, k) => n + f[k].length, 0) + (f.min != null || f.max != null ? 1 : 0) + (f.mode ? 1 : 0);
  const anyFilter = LIST_KEYS.some((k) => f[k].length) || f.q || f.min != null || f.max != null || f.mode;

  return (
    <div className="flex flex-col gap-4">
      <form action={path} className="flex gap-2" role="search">
        {/* keep the other filters when searching */}
        {LIST_KEYS.filter((k) => f[k].length).map((k) => (
          <input key={k} type="hidden" name={k} value={f[k].join(",")} />
        ))}
        {f.mode && <input type="hidden" name="mode" value={f.mode} />}
        {f.sort !== "recommended" && <input type="hidden" name="sort" value={f.sort} />}
        <Input name="q" type="search" defaultValue={f.q} placeholder={t("searchPlaceholder")} aria-label={t("search")} className="h-12 text-lg md:text-lg" />
        <Button type="submit" className="h-12 px-4" aria-label={t("search")}>
          <Search className="size-5" />
        </Button>
      </form>

      <div className="-mx-4 flex flex-col gap-2 px-4">
        <div className="flex gap-2 overflow-x-auto pb-1">{row("occasion", facets.occasions)}</div>
        <div className="flex gap-2 overflow-x-auto pb-1">{row("category", facets.categories)}</div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {facets.colours.map((c) => (
            <ChipLink key={c.slug} href={href({ colour: toggle(f.colour, c.slug) })} active={f.colour.includes(c.slug)} className="px-3">
              <span className="size-5 rounded-full border border-border" style={{ backgroundColor: c.hex }} aria-hidden />
              {name(c)}
            </ChipLink>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">{row("for", facets.forWhom)}</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" className="h-12 gap-2 text-base" />}>
            <SlidersHorizontal className="size-5" />
            {t("filters")}
            {panelCount > 0 && <span className="bg-[var(--haldi)] px-2 text-[var(--haldi-ink)]">{panelCount}</span>}
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto px-4 pb-8">
            <SheetHeader className="px-0">
              <SheetTitle className="text-2xl">{t("filters")}</SheetTitle>
            </SheetHeader>
            <section className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold">{t("rentOrBuy")}</h3>
              <div className="flex flex-wrap gap-2">
                <ChipLink href={href({ mode: f.mode === "rent" ? null : "rent" })} active={f.mode === "rent"}>
                  {t("rent")}
                </ChipLink>
                <ChipLink href={href({ mode: f.mode === "buy" ? null : "buy" })} active={f.mode === "buy"}>
                  {t("buy")}
                </ChipLink>
              </div>
            </section>
            <section className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold">{t("size")}</h3>
              <div className="flex flex-wrap gap-2">{row("size", facets.sizes)}</div>
            </section>
            <section className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold">{t("age")}</h3>
              <div className="flex flex-wrap gap-2">{row("age", facets.ageRanges)}</div>
            </section>
            {!shopId && (
              <section className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">{t("area")}</h3>
                <div className="flex flex-wrap gap-2">{row("area", facets.areas)}</div>
              </section>
            )}
            <form action={path} className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold">{t("priceRange")}</h3>
              {LIST_KEYS.filter((k) => f[k].length).map((k) => (
                <input key={k} type="hidden" name={k} value={f[k].join(",")} />
              ))}
              {f.q && <input type="hidden" name="q" value={f.q} />}
              {f.mode && <input type="hidden" name="mode" value={f.mode} />}
              <div className="flex items-center gap-2">
                <Input name="min" inputMode="numeric" pattern="\d*" defaultValue={f.min ?? ""} placeholder={t("min")} aria-label={t("min")} className="h-12 text-lg md:text-lg" />
                <span>–</span>
                <Input name="max" inputMode="numeric" pattern="\d*" defaultValue={f.max ?? ""} placeholder={t("max")} aria-label={t("max")} className="h-12 text-lg md:text-lg" />
              </div>
              <Button type="submit" className="h-12 text-base">
                {t("apply")}
              </Button>
            </form>
            {anyFilter && (
              <Button variant="ghost" nativeButton={false} render={<Link href={path} />} className="h-12 text-base">
                {t("clear")}
              </Button>
            )}
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-1 overflow-x-auto">
          <ArrowDownUp className="size-5 shrink-0" aria-label={t("sort")} />
          {SORTS.map((s) => (
            <ChipLink key={s} href={href({ sort: s })} active={f.sort === s} className="h-12 border-0 px-3">
              {t(`sort_${s}`)}
            </ChipLink>
          ))}
        </div>
      </div>

      <p className="text-base text-muted-foreground" aria-live="polite">
        {t("count", { count: total })}
      </p>

      {items.length === 0 ? (
        <section className="flex flex-col items-start gap-3 bg-card px-6 py-10">
          <SearchX className="size-10 text-[var(--haldi)]" aria-hidden />
          <h2 className="text-2xl font-semibold">{t("emptyTitle")}</h2>
          <p className="text-lg">{anyFilter ? t("emptyFiltered") : t("emptyBody")}</p>
          {anyFilter && (
            <Button nativeButton={false} render={<Link href={path} />} className="h-12 text-base">
              {t("clear")}
            </Button>
          )}
        </section>
      ) : (
        <ProductGrid>
          {items.map((p, i) => (
            <ProductCard key={p.id} p={p} priority={i < 2} />
          ))}
        </ProductGrid>
      )}
      {items.length < total && (
        <Button variant="outline" nativeButton={false} render={<Link href={href({ page: f.page + 1 })} scroll={false} />} className="h-14 self-center px-8 text-lg">
          {t("loadMore", { count: Math.min(PAGE_SIZE, total - items.length) })}
        </Button>
      )}
    </div>
  );
}
