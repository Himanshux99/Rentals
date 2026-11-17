"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { grabFrame } from "@/lib/image/upload";

/** Default frame: 2 s in, or the middle of a clip shorter than 4 s. */
export const defaultFrameAt = (duration: number) => Math.min(2, duration / 2);

type Props = { file: File | null; duration: number; onDone: (frame: File) => void; onCancel: () => void };

/** Full-screen on phones: scrub the video and pick the frame used as the poster and the WhatsApp preview. */
export function FrameDialog({ file, duration, onDone, onCancel }: Props) {
  const t = useTranslations("upload");
  const [src, setSrc] = useState<string>();
  const [at, setAt] = useState(() => defaultFrameAt(duration));
  const [busy, setBusy] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- blob URLs must be created and revoked with the effect
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const seek = (v: number) => {
    setAt(v);
    if (video.current) video.current.currentTime = v;
  };

  async function confirm() {
    if (!file) return;
    setBusy(true);
    try {
      onDone(await grabFrame(file, at));
    } catch (e) {
      console.error(e);
      onCancel();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 h-dvh max-w-none translate-x-0 translate-y-0 grid-rows-[auto_1fr_auto] gap-3 rounded-none sm:top-1/2 sm:left-1/2 sm:h-[90dvh] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"
      >
        <DialogTitle className="text-lg">{t("frameTitle")}</DialogTitle>
        <div className="flex min-h-0 items-center justify-center overflow-hidden bg-black">
          {src && (
            <video ref={video} src={src} muted playsInline preload="auto" className="max-h-full max-w-full" onLoadedMetadata={(e) => (e.currentTarget.currentTime = at)} />
          )}
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-base text-muted-foreground">{t("frameHelp")}</p>
          <div className="flex h-12 items-center px-1">
            <Slider min={0} max={Math.max(0.1, duration)} step={0.1} value={[at]} onValueChange={(v) => seek(Array.isArray(v) ? v[0] : v)} aria-label={t("frameSlider")} />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-14 flex-1 text-lg" onClick={onCancel}>{t("frameCancel")}</Button>
            <Button type="button" className="h-14 flex-1 text-lg" disabled={busy} onClick={confirm}>{t("frameDone")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
