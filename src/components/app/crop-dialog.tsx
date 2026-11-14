"use client";
import { useEffect, useRef, useState } from "react";
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { useTranslations } from "next-intl";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { chip } from "@/components/app/chip";

// Common shapes; "free" leaves the frame unlocked.
const RATIOS = { free: undefined, "1:1": 1, "4:5": 4 / 5, "3:2": 3 / 2 } as const;
type RatioKey = keyof typeof RATIOS;

const FULL: Crop = { unit: "%", x: 0, y: 0, width: 100, height: 100 };

const toBlob = (c: HTMLCanvasElement) => new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.95));

async function load(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

/** Cut `area` (in the displayed image's pixels) out of the full-size photo. */
async function crop(src: string, shown: HTMLImageElement, area: PixelCrop): Promise<File> {
  const img = await load(src);
  const [sx, sy] = [img.naturalWidth / shown.width, img.naturalHeight / shown.height];
  const out = document.createElement("canvas");
  out.width = Math.round(area.width * sx);
  out.height = Math.round(area.height * sy);
  out.getContext("2d")!.drawImage(img, area.x * sx, area.y * sy, out.width, out.height, 0, 0, out.width, out.height);
  const blob = await toBlob(out);
  if (!blob) throw new Error("crop failed");
  return new File([blob], "crop.jpg", { type: "image/jpeg" });
}

async function rotate90(src: string): Promise<string> {
  const img = await load(src);
  const c = document.createElement("canvas");
  c.width = img.naturalHeight;
  c.height = img.naturalWidth;
  const ctx = c.getContext("2d")!;
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  const blob = await toBlob(c);
  if (!blob) throw new Error("rotate failed");
  return URL.createObjectURL(blob);
}

type Props = { file: File | null; onDone: (file: File) => void; onCancel: () => void };

/** Full-screen on phones: drag the frame and its corners to pick any part of the photo, rotate. */
export function CropDialog({ file, onDone, onCancel }: Props) {
  const t = useTranslations("upload");
  const [src, setSrc] = useState<string>();
  const [crop_, setCrop] = useState<Crop>(FULL);
  const [area, setArea] = useState<PixelCrop>();
  const [busy, setBusy] = useState(false);
  const [ratio, setRatio] = useState<RatioKey>("free");
  const imgRef = useRef<HTMLImageElement>(null);
  const urls = useRef<string[]>([]);

  const track = (url: string) => {
    urls.current.push(url);
    setSrc(url);
    setCrop(FULL);
    setArea(undefined);
  };

  // Picking a ratio snaps the frame to the biggest centred box of that shape; "free" keeps the frame as it is.
  function pickRatio(key: RatioKey) {
    setRatio(key);
    const aspect = RATIOS[key];
    const img = imgRef.current;
    if (!aspect || !img) return;
    const next = centerCrop(makeAspectCrop({ unit: "%", width: 100 }, aspect, img.width, img.height), img.width, img.height);
    // a wide ratio on a tall photo can exceed the height: fit by height instead
    const fixed = next.height > 100 ? centerCrop(makeAspectCrop({ unit: "%", height: 100 }, aspect, img.width, img.height), img.width, img.height) : next;
    setCrop(fixed);
    setArea({ unit: "px", x: (fixed.x / 100) * img.width, y: (fixed.y / 100) * img.height, width: (fixed.width / 100) * img.width, height: (fixed.height / 100) * img.height });
  }

  useEffect(() => {
    if (!file) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- blob URLs must be created and revoked with the effect
    track(URL.createObjectURL(file));
    const owned = urls.current;
    return () => owned.splice(0).forEach(URL.revokeObjectURL);
  }, [file]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      onCancel();
    } finally {
      setBusy(false);
    }
  }

  const confirm = () => src && imgRef.current && area && run(async () => onDone(await crop(src, imgRef.current!, area)));
  const rotate = () => src && run(async () => track(await rotate90(src)));

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 h-dvh max-w-none translate-x-0 translate-y-0 grid-rows-[auto_1fr_auto] gap-3 rounded-none sm:top-1/2 sm:left-1/2 sm:h-[90dvh] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"
      >
        <DialogTitle className="text-lg">{t("cropTitle")}</DialogTitle>
        <div className="flex min-h-0 items-center justify-center overflow-hidden bg-black">
          {src && (
            <ReactCrop crop={crop_} aspect={RATIOS[ratio]} onChange={(_, pct) => setCrop(pct)} onComplete={setArea} minWidth={48} minHeight={48} keepSelection>
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img
                ref={imgRef}
                src={src}
                alt=""
                className="max-h-[60dvh] w-auto max-w-full"
                onLoad={(e) => {
                  const { width, height } = e.currentTarget;
                  setArea({ unit: "px", x: 0, y: 0, width, height });
                }}
              />
            </ReactCrop>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-base text-muted-foreground">{t("cropHelp")}</p>
          <ToggleGroup value={[ratio]} onValueChange={(v) => v[0] && pickRatio(v[0] as RatioKey)} className="flex-wrap">
            <ToggleGroupItem value="free" className={chip}>{t("cropFree")}</ToggleGroupItem>
            <ToggleGroupItem value="1:1" className={chip}>1:1</ToggleGroupItem>
            <ToggleGroupItem value="4:5" className={chip}>4:5</ToggleGroupItem>
            <ToggleGroupItem value="3:2" className={chip}>3:2</ToggleGroupItem>
          </ToggleGroup>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-14 flex-1 text-lg" onClick={onCancel}>{t("cropCancel")}</Button>
            <Button type="button" variant="outline" className="h-14 w-14" disabled={busy} onClick={rotate} aria-label={t("cropRotate")}>
              <RotateCw className="size-5" />
            </Button>
            <Button type="button" className="h-14 flex-1 text-lg" disabled={!area || busy} onClick={confirm}>{t("cropDone")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
