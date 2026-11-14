"use client";
import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Flag, Heart, MessageCircle, Phone, Send, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { chip } from "@/components/app/chip";
import { enquiryMessage, waLink, waShare } from "@/lib/catalog";
import { readSaved, useIsSaved, writeSaved } from "@/lib/saved";
import { reportAction } from "./actions";

type Size = { id: string; name: string; available: number };
type Props = {
  code: string;
  title: string;
  price: string;
  cover: string | null;
  url: string;
  whatsappPhone: string;
  sizes: Size[];
};

const REASONS = ["notAvailable", "wrongPrice", "wrongPhotos", "fake", "other"] as const;

function beacon(data: object) {
  const body = JSON.stringify(data);
  // sendBeacon survives the jump to WhatsApp; fetch keepalive is the fallback
  if (!navigator.sendBeacon?.("/api/events", body)) fetch("/api/events", { method: "POST", body, keepalive: true }).catch(() => {});
}

export function ProductActions({ code, title, price, cover, url, whatsappPhone, sizes }: Props) {
  const t = useTranslations("product_page");
  const locale = useLocale() as "hi" | "en";
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [ask, setAsk] = useState(false);
  const [report, setReport] = useState(false);
  const saved = useIsSaved(code);
  const [pending, start] = useTransition();
  const size = sizes.find((s) => s.id === sizeId);

  useEffect(() => beacon({ kind: "view", code }), [code]);

  function toggleSave() {
    const list = readSaved();
    const next = list.includes(code) ? list.filter((c) => c !== code) : [code, ...list];
    writeSaved(next);
    toast(next.includes(code) ? t("savedToast") : t("unsavedToast"));
  }

  function send() {
    beacon({ kind: "enquiry", code, sizeId });
    window.open(waLink(whatsappPhone, enquiryMessage(locale, { title, code, url, size: size?.name })), "_blank", "noopener,noreferrer");
    setAsk(false);
  }

  function sendReport(reason: string) {
    start(async () => {
      const r = await reportAction(code, reason);
      setReport(false);
      toast(r === "ok" ? t("reportThanks") : t("reportLimited"));
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {sizes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t("pickSize")}</h2>
          <ToggleGroup value={sizeId ? [sizeId] : []} onValueChange={(v: string[]) => setSizeId(v[0] ?? null)} className="flex-wrap">
            {sizes.map((s) => (
              <ToggleGroupItem key={s.id} value={s.id} className={`${chip} flex-col gap-0 py-1 leading-tight`}>
                <span>{s.name}</span>
                <span className="text-xs">{s.available > 0 ? t("left", { count: s.available }) : t("rentedOut")}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>
      )}

      <Button onClick={() => setAsk(true)} className="h-14 gap-2 bg-[#1f8a4c] text-lg text-white hover:bg-[#1f8a4c]/85">
        <MessageCircle className="size-6" />
        {t("ask")}
      </Button>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" nativeButton={false} render={<a href={`tel:${whatsappPhone}`} />} className="h-12 gap-2 text-base">
          <Phone className="size-5" />
          {t("call")}
        </Button>
        <Button variant="outline" onClick={toggleSave} aria-pressed={saved} className="h-12 gap-2 text-base">
          <Heart className={saved ? "size-5 fill-current text-[var(--haldi)]" : "size-5"} />
          {saved ? t("saved") : t("save")}
        </Button>
        <Button variant="outline" nativeButton={false} render={<a href={waShare(`${title} ${url}`)} target="_blank" rel="noopener noreferrer" />} className="h-12 gap-2 text-base">
          <Share2 className="size-5" />
          {t("share")}
        </Button>
        <Button variant="outline" onClick={() => setReport(true)} className="h-12 gap-2 text-base">
          <Flag className="size-5" />
          {t("report")}
        </Button>
      </div>

      <Dialog open={ask} onOpenChange={setAsk}>
        <DialogContent className="gap-5">
          <DialogHeader>
            <DialogTitle className="text-2xl">{t("askTitle")}</DialogTitle>
            <DialogDescription className="text-base">{t("askBody")}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- already-loaded cover */}
            {cover && <img src={cover} alt="" className="aspect-[3/4] w-20 object-cover" />}
            <div className="flex flex-col gap-1 text-base">
              <p className="font-semibold">{title}</p>
              <p className="text-muted-foreground">
                {t("code")}: {code}
                {size && ` · ${t("size")}: ${size.name}`}
              </p>
              <p className="font-semibold text-[var(--haldi)]">{price}</p>
            </div>
          </div>
          <p className="flex items-center gap-2 bg-muted p-3 text-base">
            <Send className="size-5 shrink-0 text-[#1f8a4c]" />
            {t("sendHint")}
          </p>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={send} className="h-14 gap-2 bg-[#1f8a4c] text-lg text-white hover:bg-[#1f8a4c]/85">
              <MessageCircle className="size-6" />
              {t("send")}
            </Button>
            <DialogClose render={<Button variant="ghost" className="h-12 text-base" />}>{t("cancel")}</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={report} onOpenChange={setReport}>
        <SheetContent side="bottom" className="px-4 pb-8">
          <SheetHeader className="px-0">
            <SheetTitle className="text-2xl">{t("reportTitle")}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-2">
            {REASONS.map((r) => (
              <Button key={r} variant="outline" disabled={pending} onClick={() => sendReport(r)} className="h-12 justify-start text-base">
                {t(`reason_${r}`)}
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
