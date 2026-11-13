import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { BadgeCheck, LogIn, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmButton } from "@/components/app/confirm-button";
import type { ShopStatus } from "@/generated/prisma/client";
import { listShops } from "@/server/services/shops";
import { cn } from "@/lib/utils";
import { changeShopStatus, deleteShopAction, startImpersonating, toggleVerified } from "./actions";

export const metadata: Metadata = { title: "Shops" };

const STATUSES: ShopStatus[] = ["pending", "approved", "suspended"];

export default async function AdminShops({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as ShopStatus) ? (sp.status as ShopStatus) : "pending";
  const q = typeof sp.q === "string" ? sp.q : "";
  const [t, locale, shops] = await Promise.all([getTranslations("admin"), getLocale(), listShops(status, q)]);
  const date = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short" });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-semibold">{t("title")}</h1>
        <Button nativeButton={false} render={<Link href="/admin/shops/new" />} className="h-12 gap-2 text-base">
          <Plus className="size-5" />
          {t("createShop")}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <nav className="flex flex-wrap gap-2" aria-label={t("title")}>
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={`/admin?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              aria-current={s === status ? "page" : undefined}
              className={cn("inline-flex h-12 items-center px-4 text-base", s === status ? "bg-[var(--haldi)] text-[var(--haldi-ink)]" : "bg-card hover:bg-accent")}
            >
              {t(s)}
            </Link>
          ))}
        </nav>
        <form className="flex gap-2" role="search">
          <input type="hidden" name="status" value={status} />
          <Input name="q" defaultValue={q} placeholder={t("searchShops")} aria-label={t("searchShops")} className="h-12 text-base md:text-base" />
          <Button type="submit" variant="outline" className="h-12" aria-label={t("searchShops")}>
            <Search className="size-5" />
          </Button>
        </form>
      </div>

      {shops.length === 0 ? (
        <p className="bg-card px-6 py-10 text-lg">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto bg-card">
          <Table className="text-base">
            <TableHeader>
              <TableRow>
                <TableHead>{t("shop")}</TableHead>
                <TableHead>{t("owner")}</TableHead>
                <TableHead>{t("area")}</TableHead>
                <TableHead>{t("phone")}</TableHead>
                <TableHead className="text-right">{t("joined")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shops.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-1">
                      {s.shopName}
                      {s.isVerified && <BadgeCheck className="size-4 text-[var(--haldi)]" aria-label={t("verified")} />}
                    </span>
                    <div className="text-sm text-muted-foreground">{s.addressLine}</div>
                  </TableCell>
                  <TableCell>
                    {s.ownerName}
                    <div className="text-sm text-muted-foreground">{s.owner?.email ?? t("unclaimed")}</div>
                  </TableCell>
                  <TableCell>{locale === "hi" ? s.area.nameHi : s.area.nameEn}</TableCell>
                  <TableCell className="tabular-nums">
                    <a href={`https://wa.me/${s.whatsappPhone.replace("+", "")}`} className="underline underline-offset-4">
                      {s.whatsappPhone}
                    </a>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{date.format(s.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      {s.status !== "approved" && (
                        <form action={changeShopStatus.bind(null, s.id, "approved")}>
                          <Button type="submit" className="h-12 px-4 text-base">
                            {t(s.status === "pending" ? "approve" : "restore")}
                          </Button>
                        </form>
                      )}
                      {s.status !== "suspended" && (
                        <form action={changeShopStatus.bind(null, s.id, "suspended")}>
                          <Button type="submit" variant="ghost" className="h-12 px-4 text-base">
                            {t("suspend")}
                          </Button>
                        </form>
                      )}
                      <form action={toggleVerified.bind(null, s.id, !s.isVerified)}>
                        <Button type="submit" variant="ghost" className="h-12 gap-1 px-3 text-base">
                          <BadgeCheck className="size-5" />
                          {s.isVerified ? t("unverify") : t("verify")}
                        </Button>
                      </form>
                      <form action={startImpersonating.bind(null, s.id)}>
                        <Button type="submit" variant="ghost" className="h-12 gap-1 px-3 text-base">
                          <LogIn className="size-5" />
                          {t("actAs")}
                        </Button>
                      </form>
                      <ConfirmButton
                        action={deleteShopAction.bind(null, s.id)}
                        className="h-12 px-3 text-destructive"
                        trigger={<Trash2 className="size-5" aria-label={t("delete")} />}
                        title={t("deleteShopTitle")}
                        body={t("deleteShopBody", { shop: s.shopName })}
                        confirm={t("delete")}
                        cancel={t("cancel")}
                      />
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
