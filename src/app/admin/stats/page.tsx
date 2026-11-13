import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStats } from "@/server/services/admin";

export const metadata: Metadata = { title: "Stats" };

export default async function AdminStats() {
  const [t, s] = await Promise.all([getTranslations("admin"), getStats(30)]);
  const totals = [
    [t("statShops"), `${s.liveShops} / ${s.shops}`],
    [t("statProducts"), `${s.visible} / ${s.products}`],
    [t("statViews30"), s.byDay.reduce((n, d) => n + d.views, 0)],
    [t("statClicks30"), s.byDay.reduce((n, d) => n + d.clicks, 0)],
  ] as const;

  return (
    <>
      <h1 className="text-4xl font-semibold">{t("navStats")}</h1>
      <dl className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
        {totals.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1 bg-card p-4">
            <dt className="text-base text-muted-foreground">{k}</dt>
            <dd className="text-3xl font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold">{t("topProducts")}</h2>
          <div className="overflow-x-auto bg-card">
            <Table className="text-base">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("product")}</TableHead>
                  <TableHead className="text-right">{t("viewsClicks")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.topProducts.map((p) => (
                  <TableRow key={p.code}>
                    <TableCell>
                      <Link href={`/p/${p.code}`} className="underline-offset-4 hover:underline">
                        {p.titleEn}
                      </Link>
                      <div className="text-sm text-muted-foreground">
                        {p.code} · {p.design.shop.shopName}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.viewCount} / {p.enquiryCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold">{t("topShops")}</h2>
          <div className="overflow-x-auto bg-card">
            <Table className="text-base">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("shop")}</TableHead>
                  <TableHead className="text-right">{t("viewsClicks")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.topShops.map((sh) => (
                  <TableRow key={sh.slug}>
                    <TableCell>
                      <Link href={`/shop/${sh.slug}`} className="underline-offset-4 hover:underline">
                        {sh.shopName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {sh.views} / {sh.enquiries}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold">{t("byDay")}</h2>
        <div className="max-w-md overflow-x-auto bg-card">
          <Table className="text-base">
            <TableHeader>
              <TableRow>
                <TableHead>{t("day")}</TableHead>
                <TableHead className="text-right">{t("views")}</TableHead>
                <TableHead className="text-right">{t("clicks")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.byDay.map((d) => (
                <TableRow key={d.day}>
                  <TableCell className="tabular-nums">{d.day}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.views}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.clicks}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </>
  );
}
