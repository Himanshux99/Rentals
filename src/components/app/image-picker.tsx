"use client";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, ImagePlus, TriangleAlert, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { compressImage, putFile } from "@/lib/image/upload";
import { discardUpload, signUpload, type UploadScope } from "@/app/seller/uploads";

/** An image in the picker. `key` is set once both files are in storage. */
export type PickedImage = { id: string; preview: string; key?: string; ogKey?: string; progress: number; failed?: boolean };

type Props = {
  scope: UploadScope;
  max: number;
  maxEdge: number;
  images: PickedImage[];
  setImages: (fn: (prev: PickedImage[]) => PickedImage[]) => void;
};

/** Pick from camera or gallery, compress in the browser, upload straight to storage. First image is the cover. */
export function ImagePicker({ scope, max, maxEdge, images, setImages }: Props) {
  const t = useTranslations("upload");
  const input = useRef<HTMLInputElement>(null);

  const patch = (id: string, p: Partial<PickedImage>) => setImages((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)));

  async function upload(file: File, id: string) {
    try {
      const { main, og } = await compressImage(file, maxEdge, scope === "shop");
      const signed = await signUpload(scope, { type: main.type, bytes: main.size }, og && { type: og.type, bytes: og.size });
      const total = main.size + (og?.size ?? 0);
      const loaded = [0, 0];
      const report = (slot: number) => (n: number) => {
        loaded[slot] = n;
        patch(id, { progress: Math.min(99, Math.round(((loaded[0] + loaded[1]) / total) * 100)) });
      };
      await Promise.all([putFile(signed.url, main, report(0)), og && signed.ogUrl && putFile(signed.ogUrl, og, report(1))]);
      patch(id, { key: signed.key, ogKey: signed.ogKey, progress: 100 });
    } catch (e) {
      console.error(e);
      patch(id, { failed: true });
    }
  }

  function add(files: FileList | null) {
    const picked = [...(files ?? [])].slice(0, max - images.length).map((file) => ({ file, id: crypto.randomUUID() }));
    setImages((prev) => [...prev, ...picked.map(({ file, id }) => ({ id, preview: URL.createObjectURL(file), progress: 0 }))]);
    picked.forEach(({ file, id }) => upload(file, id));
    if (input.current) input.current.value = "";
  }

  function remove(img: PickedImage) {
    setImages((prev) => prev.filter((i) => i.id !== img.id));
    URL.revokeObjectURL(img.preview);
    const keys = [img.key, img.ogKey].filter((k): k is string => !!k);
    if (keys.length) discardUpload(scope, keys).catch(console.error);
  }

  function move(index: number, by: number) {
    setImages((prev) => {
      const next = [...prev];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img, i) => (
            <li key={img.id} className="flex flex-col gap-1 bg-muted">
              <div className="relative aspect-[3/4] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                <img src={img.preview} alt={t("photo", { n: i + 1 })} className="size-full object-cover" />
                {i === 0 && max > 1 && <Badge className="absolute left-1 top-1 bg-[var(--haldi)] text-[var(--haldi-ink)]">{t("cover")}</Badge>}
                {img.failed && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/70 p-2 text-center text-sm">
                    <TriangleAlert className="size-6" />
                    {t("failed")}
                  </div>
                )}
              </div>
              {!img.key && !img.failed && <Progress value={img.progress} aria-label={t("uploading")} className="px-1" />}
              <div className="flex">
                {max > 1 && (
                  <>
                    <Button type="button" variant="ghost" className="h-12 flex-1" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("moveLeft")}>
                      <ArrowLeft className="size-5" />
                    </Button>
                    <Button type="button" variant="ghost" className="h-12 flex-1" disabled={i === images.length - 1} onClick={() => move(i, 1)} aria-label={t("moveRight")}>
                      <ArrowRight className="size-5" />
                    </Button>
                  </>
                )}
                <Button type="button" variant="ghost" className="h-12 flex-1" onClick={() => remove(img)} aria-label={t("remove")}>
                  <X className="size-5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {images.length < max && (
        <Button type="button" variant="outline" className="h-14 gap-2 text-lg" onClick={() => input.current?.click()}>
          <ImagePlus className="size-5" />
          {images.length ? t("addMore") : t("add")}
        </Button>
      )}
      {max > 1 && <p className="text-base text-muted-foreground">{t("limit", { count: images.length, max })}</p>}
      <input ref={input} type="file" accept="image/*" multiple={max > 1} hidden onChange={(e) => add(e.target.files)} />
    </div>
  );
}
