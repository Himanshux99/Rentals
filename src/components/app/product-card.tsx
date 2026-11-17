import Image from "next/image";
import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { BadgeCheck, MapPin } from "lucide-react";
import { AutoplayVideo } from "@/components/app/autoplay-video";
import { Badge } from "@/components/ui/badge";
import { availability, mainPrice } from "@/lib/catalog";
import { stillKey } from "@/lib/media";
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
    <Badge className={cn("h-7 rounded-full px-3 text-sm font-medium", a.kind === "available" ? "bg-secondary text-[var(--navy)]" : "bg-[var(--beige)]/90 text-[var(--ink)]", className)}>
      {label}
    </Badge>
  );
}

export async function ProductCard({ p, priority }: { p: CatalogCard; priority?: boolean }) {
  const [hi, t, tc] = await Promise.all([getLocale().then((l) => l === "hi"), getTranslations("catalog"), getTranslations("common")]);
  const cover = p.images[0];
  const shop = p.design.shop;
  return (
    <li className="flex flex-col rounded-2xl bg-card p-2 shadow-[var(--shadow-card)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] active:translate-y-0 active:scale-[0.99] motion-reduce:transition-none">
      <Link href={`/p/${p.code}`} className="flex flex-1 flex-col gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-ring">
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
          {cover && (
            <Image
              src={imageSrc(stillKey(cover))}
              alt=""
              fill
              priority={priority}
              sizes="(min-width: 1280px) 22vw, (min-width: 640px) 33vw, 50vw"
              className="object-contain"
            />
          )}
          {/* the poster above shows until the video is on screen and playing */}
          {cover?.kind === "video" && <AutoplayVideo src={imageSrc(cover.key)} className="absolute inset-0 size-full object-contain" />}
          <AvailabilityBadge sizes={p.sizes} className="absolute left-2 top-2" />
        </div>
        <div className="flex flex-1 flex-col gap-1 px-2">
          <p className="text-base font-semibold leading-snug">{hi ? p.titleHi : p.titleEn}</p>
          <p className="text-xl font-bold tabular-nums">
            <PriceText prices={p.design} />
          </p>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" />
            <span className="truncate">
              {shop.shopName}, {hi ? shop.area.nameHi : shop.area.nameEn}
            </span>
            {shop.isVerified && <BadgeCheck className="size-4 shrink-0 text-[var(--gold)]" aria-label={tc("verified")} />}
          </p>
        </div>
        <span className="mt-1 inline-flex h-12 items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground">{t("rentNow")}</span>
      </Link>
    </li>
  );
}

export function ProductGrid({ children }: { children: React.ReactNode }) {
  return <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</ul>;
}
