import Image from "next/image";
import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { BadgeCheck, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { availability, mainPrice } from "@/lib/catalog";
import type { CatalogCard } from "@/server/services/catalog";
import { imageSrc } from "@/server/storage";
import { cn } from "@/lib/utils";

export async function PriceText({ prices }: { prices: Parameters<typeof mainPrice>[0] }) {
  const t = await getTranslations("catalog");
  const p = mainPrice(prices);
  if (!p) return null;
  const amount = p.amount.toLocaleString("en-IN");
  return <>{t(p.unit === "day" ? "perDay" : p.unit === "week" ? "perWeek" : "forSale", { amount })}</>;
}

export async function AvailabilityBadge({ sizes, className }: { sizes: CatalogCard["sizes"]; className?: string }) {
  const [t, format] = await Promise.all([getTranslations("catalog"), getFormatter()]);
  const a = availability(sizes);
  const label =
    a.kind === "available" ? t("available") : a.kind === "rented" ? t("rentedUntil", { date: format.dateTime(a.freeFrom, { day: "numeric", month: "short", timeZone: "UTC" }) }) : t("allRented");
  return (
    <Badge className={cn("h-7 px-2 text-sm", a.kind === "available" ? "bg-[var(--haldi)] text-[var(--haldi-ink)]" : "bg-black/70 text-white", className)}>
      {label}
    </Badge>
  );
}

export async function ProductCard({ p, priority }: { p: CatalogCard; priority?: boolean }) {
  const hi = (await getLocale()) === "hi";
  const cover = p.images[0];
  const shop = p.design.shop;
  return (
    <li className="flex flex-col bg-card">
      <Link href={`/p/${p.code}`} className="flex flex-1 flex-col focus-visible:outline-2 focus-visible:outline-ring">
        <div className="relative aspect-[3/4] bg-muted">
          {cover && (
            <Image src={imageSrc(cover.key)} alt="" fill priority={priority} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" className="object-cover" />
          )}
          <AvailabilityBadge sizes={p.sizes} className="absolute left-2 top-2" />
        </div>
        <div className="flex flex-col gap-1 p-3">
          <p className="text-base font-semibold leading-snug">{hi ? p.titleHi : p.titleEn}</p>
          <p className="text-lg font-semibold text-[var(--haldi)]">
            <PriceText prices={p.design} />
          </p>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" />
            <span className="truncate">
              {shop.shopName}, {hi ? shop.area.nameHi : shop.area.nameEn}
            </span>
            {shop.isVerified && <BadgeCheck className="size-4 shrink-0 text-[var(--haldi)]" aria-label="verified" />}
          </p>
        </div>
      </Link>
    </li>
  );
}

export function ProductGrid({ children }: { children: React.ReactNode }) {
  return <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</ul>;
}
