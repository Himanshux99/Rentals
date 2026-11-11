import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppBar } from "@/components/app/app-bar";
import type { ShopStatus } from "@/generated/prisma/client";
import { requireRole } from "@/server/auth";
import { listShops, setShopStatus } from "@/server/services/shops";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Shops" };

const STATUSES: ShopStatus[] = ["pending", "approved", "suspended"];

async function changeStatus(shopId: string, status: ShopStatus) {
  "use server";
  const admin = await requireRole("admin");
  await setShopStatus(shopId, status, admin.id);
  revalidatePath("/admin");
}

export default async function AdminShops({ searchParams }: PageProps<"/admin">) {
  await requireRole("admin");
  const q = await searchParams;
  const status = STATUSES.includes(q.status as ShopStatus) ? (q.status as ShopStatus) : "pending";
  const [t, locale, shops] = await Promise.all([getTranslations("admin"), getLocale(), listShops(status)]);
  const date = new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short" });

  return (
    <>
      <AppBar signedIn home="/admin" />
      <main className="flex flex-1 flex-col gap-6 px-4 pb-16 pt-6 sm:px-8">
        <h1 className="text-4xl font-semibold">{t("title")}</h1>
        <nav className="flex flex-wrap gap-2" aria-label={t("title")}>
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={`/admin?status=${s}`}
              aria-current={s === status ? "page" : undefined}
              className={cn(
                "inline-flex h-12 items-center px-4 text-base",
                s === status ? "bg-[var(--haldi)] text-[var(--haldi-ink)]" : "bg-card hover:bg-accent",
              )}
            >
              {t(s)}
            </Link>
          ))}
        </nav>

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
                      {s.shopName}
                      <div className="text-sm text-muted-foreground">{s.addressLine}</div>
                    </TableCell>
                    <TableCell>
                      {s.ownerName}
                      <div className="text-sm text-muted-foreground">{s.owner?.email ?? "—"}</div>
                    </TableCell>
                    <TableCell>{locale === "hi" ? s.area.nameHi : s.area.nameEn}</TableCell>
                    <TableCell className="tabular-nums">
                      <a href={`https://wa.me/${s.whatsappPhone.replace("+", "")}`} className="underline underline-offset-4">
                        {s.whatsappPhone}
                      </a>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{date.format(s.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {s.status !== "approved" && (
                          <form action={changeStatus.bind(null, s.id, "approved")}>
                            <Button type="submit" className="h-12 px-4 text-base">
                              {t(s.status === "pending" ? "approve" : "restore")}
                            </Button>
                          </form>
                        )}
                        {s.status !== "suspended" && (
                          <form action={changeStatus.bind(null, s.id, "suspended")}>
                            <Button type="submit" variant="ghost" className="h-12 px-4 text-base">
                              {t("suspend")}
                            </Button>
                          </form>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </>
  );
}
