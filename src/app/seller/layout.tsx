import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppBar } from "@/components/app/app-bar";
import { stopImpersonating } from "@/app/admin/actions";
import { requireRole } from "@/server/auth";
import { db } from "@/server/db";
import { IMPERSONATE_COOKIE } from "@/server/seller";

export default async function SellerLayout({ children }: LayoutProps<"/seller">) {
  const user = await requireRole("seller");
  const id = user.role === "admin" ? (await cookies()).get(IMPERSONATE_COOKIE)?.value : undefined;
  const shop = id ? await db.shop.findUnique({ where: { id }, select: { shopName: true } }) : null;
  const t = await getTranslations("admin");
  return (
    <>
      {shop && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 bg-destructive px-4 py-2 text-white sm:px-8">
          <span className="flex items-center gap-2 text-base font-semibold">
            <ShieldAlert className="size-5" />
            {t("actingAs", { shop: shop.shopName })}
          </span>
          <form action={stopImpersonating}>
            <Button type="submit" variant="secondary" className="h-12 text-base">
              {t("stopActing")}
            </Button>
          </form>
        </div>
      )}
      <AppBar signedIn home={user.role === "admin" ? "/admin" : "/seller"} />
      <main className="flex flex-1 flex-col px-4 pb-16 pt-6 sm:px-8">{children}</main>
    </>
  );
}
