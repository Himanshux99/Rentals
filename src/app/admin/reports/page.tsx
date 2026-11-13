import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Check, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ReportStatus } from "@/generated/prisma/client";
import { listReports } from "@/server/services/admin";
import { cn } from "@/lib/utils";
import { closeReportAction } from "../actions";

export const metadata: Metadata = { title: "Reports" };

const STATUSES: ReportStatus[] = ["open", "resolved", "dismissed"];

export default async function AdminReports({ searchParams }: PageProps<"/admin/reports">) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as ReportStatus) ? (sp.status as ReportStatus) : "open";
  const [t, tp, locale, reports] = await Promise.all([getTranslations("admin"), getTranslations("product_page"), getLocale(), listReports(status)]);
  const date = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  return (
    <>
      <h1 className="text-4xl font-semibold">{t("navReports")}</h1>
      <nav className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/reports?status=${s}`}
            aria-current={s === status ? "page" : undefined}
            className={cn("inline-flex h-12 items-center px-4 text-base", s === status ? "bg-[var(--haldi)] text-[var(--haldi-ink)]" : "bg-card hover:bg-accent")}
          >
            {t(`report_${s}`)}
          </Link>
        ))}
      </nav>
      {reports.length === 0 ? (
        <p className="bg-card px-6 py-10 text-lg">{t("noReports")}</p>
      ) : (
        <div className="overflow-x-auto bg-card">
          <Table className="text-base">
            <TableHeader>
              <TableRow>
                <TableHead>{t("product")}</TableHead>
                <TableHead>{t("reason")}</TableHead>
                <TableHead>{t("when")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link href={`/p/${r.product.code}`} className="font-medium underline-offset-4 hover:underline">
                      {locale === "hi" ? r.product.titleHi : r.product.titleEn}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {r.product.code} · {r.product.design.shop.shopName}
                    </div>
                  </TableCell>
                  <TableCell>{tp.has(`reason_${r.reason}`) ? tp(`reason_${r.reason}`) : r.reason}</TableCell>
                  <TableCell className="tabular-nums">{date.format(r.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {status === "open" && (
                      <div className="flex justify-end gap-1">
                        {!r.product.hiddenByAdmin && (
                          <form action={closeReportAction.bind(null, r.id, "resolved", true)}>
                            <Button type="submit" variant="destructive" className="h-12 gap-1 px-3 text-base">
                              <EyeOff className="size-5" />
                              {t("hideAndResolve")}
                            </Button>
                          </form>
                        )}
                        <form action={closeReportAction.bind(null, r.id, "resolved", false)}>
                          <Button type="submit" variant="ghost" className="h-12 gap-1 px-3 text-base">
                            <Check className="size-5" />
                            {t("resolve")}
                          </Button>
                        </form>
                        <form action={closeReportAction.bind(null, r.id, "dismissed", false)}>
                          <Button type="submit" variant="ghost" className="h-12 gap-1 px-3 text-base">
                            <X className="size-5" />
                            {t("dismiss")}
                          </Button>
                        </form>
                      </div>
                    )}
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
