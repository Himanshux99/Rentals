"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Volume2, VolumeX } from "lucide-react";
import { AutoplayVideo } from "@/components/app/autoplay-video";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";

/** A photo, or a video with the still frame (`poster`) it shows until it plays. */
export type GalleryMedia = { kind: "image" | "video"; src: string; poster: string };

export function Gallery({ media, title }: { media: GalleryMedia[]; title: string }) {
  const t = useTranslations("product_page");
  const tu = useTranslations("upload");
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (!api) return;
    const sync = () => setCurrent(api.selectedScrollSnap());
    api.on("select", sync);
    return () => void api.off("select", sync);
  }, [api]);

  const many = media.length > 1;
  const arrow = "size-12 rounded-full border-0 bg-black/60 text-white hover:bg-black/80 disabled:hidden [&_svg]:size-6";

  return (
    <div className="flex flex-col gap-3" role="region" aria-roledescription="carousel" aria-label={t("photos")}>
      <Carousel setApi={setApi} className="relative overflow-hidden rounded-xl border border-border">
        <CarouselContent className="ml-0">
          {media.map((m, i) => (
            <CarouselItem key={m.src} className="relative aspect-square bg-muted pl-0">
              <Image src={m.poster} alt={i === 0 ? title : `${title} ${i + 1}`} fill priority={i === 0} sizes="(min-width: 768px) 50vw, 100vw" className="object-contain" />
              {m.kind === "video" && (
                <>
                  <AutoplayVideo src={m.src} active={i === current} muted={muted} className="absolute inset-0 size-full object-contain" />
                  <Button
                    type="button"
                    size="icon"
                    className="absolute bottom-2 right-2 size-12 rounded-full border-0 bg-black/60 text-white hover:bg-black/80 [&_svg]:size-6"
                    onClick={() => setMuted((v) => !v)}
                    aria-label={tu(muted ? "unmute" : "mute")}
                  >
                    {muted ? <VolumeX /> : <Volume2 />}
                  </Button>
                </>
              )}
            </CarouselItem>
          ))}
        </CarouselContent>
        {many && (
          <>
            <CarouselPrevious className={`${arrow} left-2`} />
            <CarouselNext className={`${arrow} right-2`} />
            <span className="absolute right-2 top-2 bg-black/70 px-2 text-sm text-white tabular-nums">
              {current + 1}/{media.length}
            </span>
          </>
        )}
      </Carousel>
      {many && (
        <div className="flex justify-center gap-1">
          {media.map((_, i) => (
            // 48px tap target around a small dot
            <button key={i} type="button" onClick={() => api?.scrollTo(i)} aria-label={`${t("photos")} ${i + 1}`} aria-current={i === current} className="flex size-12 items-center justify-center">
              <span className={`size-3 rounded-full ${i === current ? "bg-primary" : "bg-border"}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
