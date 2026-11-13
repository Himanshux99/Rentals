import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BarChart3, Flag, ListChecks, ScrollText, Shirt, Store } from "lucide-react";
import { AppBar } from "@/components/app/app-bar";
import { requireRole } from "@/server/auth";

const NAV = [
  { href: "/admin", key: "navShops", icon: Store },
  { href: "/admin/products", key: "navProducts", icon: Shirt },
  { href: "/admin/reports", key: "navReports", icon: Flag },
  { href: "/admin/options", key: "navOptions", icon: ListChecks },
  { href: "/admin/stats", key: "navStats", icon: BarChart3 },
  { href: "/admin/audit", key: "navAudit", icon: ScrollText },
] as const;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireRole("admin");
  const t = await getTranslations("admin");
  return (
    <>
      <AppBar signedIn home="/admin" />
      <nav aria-label="Admin" className="flex gap-1 overflow-x-auto border-b border-border px-4 sm:px-8">
        {NAV.map(({ href, key, icon: Icon }) => (
          <Link key={href} href={href} className="inline-flex h-12 shrink-0 items-center gap-2 px-3 text-base hover:bg-accent">
            <Icon className="size-5" />
            {t(key)}
          </Link>
        ))}
      </nav>
      <main className="flex flex-1 flex-col gap-6 px-4 pb-16 pt-6 sm:px-8">{children}</main>
    </>
  );
}
