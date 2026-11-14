"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";

export function Gallery({ images, title }: { images: string[]; title: string }) {
  const t = useTranslations("product_page");
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const sync = () => setCurrent(api.selectedScrollSnap());
    api.on("select", sync);
    return () => void api.off("select", sync);
  }, [api]);

  const many = images.length > 1;
  const arrow = "size-12 rounded-full border-0 bg-black/60 text-white hover:bg-black/80 disabled:hidden [&_svg]:size-6";

  return (
    <div className="-mx-4 flex flex-col gap-3 md:mx-0" aria-label={t("photos")}>
      <Carousel setApi={setApi} className="relative">
        <CarouselContent className="ml-0">
          {images.map((src, i) => (
            <CarouselItem key={src} className="relative aspect-square bg-muted pl-0">
              <Image src={src} alt={i === 0 ? title : ""} fill priority={i === 0} sizes="(min-width: 768px) 50vw, 100vw" className="object-contain" />
            </CarouselItem>
          ))}
        </CarouselContent>
        {many && (
          <>
            <CarouselPrevious className={`${arrow} left-2`} />
            <CarouselNext className={`${arrow} right-2`} />
            <span className="absolute right-2 top-2 bg-black/70 px-2 text-sm text-white tabular-nums">
              {current + 1}/{images.length}
            </span>
          </>
        )}
      </Carousel>
      {many && (
        <div className="flex justify-center gap-1">
          {images.map((_, i) => (
            // 48px tap target around a small dot
            <button key={i} type="button" onClick={() => api?.scrollTo(i)} aria-label={`${t("photos")} ${i + 1}`} aria-current={i === current} className="flex size-8 items-center justify-center">
              <span className={`size-3 rounded-full ${i === current ? "bg-[var(--haldi)]" : "bg-border"}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
