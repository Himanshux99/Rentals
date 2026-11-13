import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Eye, EyeOff, Search, Star, StarOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listAllProducts } from "@/server/services/admin";
import { productFlag } from "../actions";

export const metadata: Metadata = { title: "Products" };

// Feature / unfeature and force-hide (SPEC §9). Everything else a seller can do goes through "act as seller".
export default async function AdminProducts({ searchParams }: PageProps<"/admin/products">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const [t, locale, products] = await Promise.all([getTranslations("admin"), getLocale(), listAllProducts(q)]);

  return (
    <>
      <h1 className="text-4xl font-semibold">{t("navProducts")}</h1>
      <form className="flex max-w-md gap-2" role="search">
        <Input name="q" defaultValue={q} placeholder={t("searchProducts")} aria-label={t("searchProducts")} className="h-12 text-base md:text-base" />
        <Button type="submit" variant="outline" className="h-12" aria-label={t("searchProducts")}>
          <Search className="size-5" />
        </Button>
      </form>
      {products.length === 0 ? (
        <p className="bg-card px-6 py-10 text-lg">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto bg-card">
          <Table className="text-base">
            <TableHeader>
              <TableRow>
                <TableHead>{t("product")}</TableHead>
                <TableHead>{t("shop")}</TableHead>
                <TableHead className="text-right">{t("viewsClicks")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/p/${p.code}`} className="font-medium underline-offset-4 hover:underline">
                      {locale === "hi" ? p.titleHi : p.titleEn}
                    </Link>
                    <div className="flex flex-wrap gap-1 text-sm text-muted-foreground">
                      <span className="tabular-nums">{p.code}</span>
                      {p.isFeatured && <Badge>{t("featured")}</Badge>}
                      {p.hiddenByAdmin && <Badge variant="destructive">{t("forceHidden")}</Badge>}
                      {p.isHidden && <Badge variant="secondary">{t("sellerHidden")}</Badge>}
                      {p._count.reports > 0 && <Badge variant="outline">{t("openReports", { count: p._count.reports })}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{p.design.shop.shopName}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.viewCount} / {p.enquiryCount}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <form action={productFlag.bind(null, p.id, "isFeatured", !p.isFeatured)}>
                        <Button type="submit" variant="ghost" className="h-12 gap-1 px-3 text-base">
                          {p.isFeatured ? <StarOff className="size-5" /> : <Star className="size-5" />}
                          {p.isFeatured ? t("unfeature") : t("feature")}
                        </Button>
                      </form>
                      <form action={productFlag.bind(null, p.id, "hiddenByAdmin", !p.hiddenByAdmin)}>
                        <Button type="submit" variant="ghost" className="h-12 gap-1 px-3 text-base">
                          {p.hiddenByAdmin ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
                          {p.hiddenByAdmin ? t("unhide") : t("forceHide")}
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
