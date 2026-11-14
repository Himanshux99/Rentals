"use client";
import { useRef, useState } from "react";
import { CropDialog } from "@/components/app/crop-dialog";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Crop, ImagePlus, TriangleAlert, X } from "lucide-react";
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
  // `editId` is set when re-cropping a photo that is already in the list.
  const [queue, setQueue] = useState<{ file: File; editId?: string }[]>([]);
  const originals = useRef(new Map<string, File>());

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

  // Any photo uploads as picked (padded to 1:1 in compressImage); crop it later with the edit icon or a tap.
  function add(files: FileList | null) {
    const picked = [...(files ?? [])].slice(0, max - images.length);
    const added = picked.map((file) => ({ file, id: crypto.randomUUID() }));
    added.forEach(({ file, id }) => originals.current.set(id, file));
    setImages((prev) => [...prev, ...added.map(({ file, id }) => ({ id, preview: URL.createObjectURL(file), progress: 0 }))]);
    added.forEach(({ file, id }) => upload(file, id));
    if (input.current) input.current.value = "";
  }

  function cropped(file: File) {
    const { file: original, editId } = queue[0];
    const id = editId ?? crypto.randomUUID();
    originals.current.set(id, original);
    const preview = URL.createObjectURL(file);
    if (editId) {
      const old = images.find((i) => i.id === editId);
      if (old) {
        URL.revokeObjectURL(old.preview);
        const keys = [old.key, old.ogKey].filter((k): k is string => !!k);
        if (keys.length) discardUpload(scope, keys).catch(console.error);
      }
      patch(id, { preview, key: undefined, ogKey: undefined, progress: 0, failed: false });
    } else {
      setImages((prev) => [...prev, { id, preview, progress: 0 }]);
    }
    upload(file, id);
    setQueue((q) => q.slice(1));
  }

  async function edit(img: PickedImage) {
    try {
      const file = originals.current.get(img.id) ?? new File([await (await fetch(img.preview)).blob()], "photo.jpg");
      setQueue([{ file, editId: img.id }]);
    } catch (e) {
      console.error(e);
    }
  }

  function remove(img: PickedImage) {
    setImages((prev) => prev.filter((i) => i.id !== img.id));
    originals.current.delete(img.id);
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

  // Every photo is stored as a 1:1 square, so show it in a square box (the padding appears as the grey background here).
  function tile(img: PickedImage, i: number) {
    const isCover = i === 0;
    return (
      <li key={img.id} className="flex flex-col gap-1 bg-muted">
        <div className="relative aspect-square overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
          <img src={img.preview} alt={t("photo", { n: i + 1 })} className="size-full object-contain" />
          {(img.key || img.failed) && <button type="button" className="absolute inset-0" onClick={() => edit(img)} aria-label={t("edit")} />}
          {isCover && max > 1 && <Badge className="absolute left-1 top-1 bg-(--haldi) text-(--haldi-ink)">{t("cover")}</Badge>}
          {img.failed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/70 p-2 text-center text-sm">
              <TriangleAlert className="size-6" />
              {t("failed")}
            </div>
          )}
        </div>
        {!img.key && !img.failed && <Progress value={img.progress} aria-label={t("uploading")} className="px-1" />}
        <div className="flex">
          {!isCover && (
            <>
              <Button type="button" variant="ghost" className="h-12 flex-1" disabled={i <= 1} onClick={() => move(i, -1)} aria-label={t("moveLeft")}>
                <ArrowLeft className="size-5" />
              </Button>
              <Button type="button" variant="ghost" className="h-12 flex-1" disabled={i === images.length - 1} onClick={() => move(i, 1)} aria-label={t("moveRight")}>
                <ArrowRight className="size-5" />
              </Button>
            </>
          )}
          <Button type="button" variant="ghost" className="h-12 flex-1" disabled={!img.key && !img.failed} onClick={() => edit(img)} aria-label={t("edit")}>
            <Crop className="size-5" />
          </Button>
          <Button type="button" variant="ghost" className="h-12 flex-1" onClick={() => remove(img)} aria-label={t("remove")}>
            <X className="size-5" />
          </Button>
        </div>
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {images.length > 0 && (
        <div className="flex flex-col gap-3">
          <ul>{tile(images[0], 0)}</ul>
          {images.length > 1 && <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{images.slice(1).map((img, i) => tile(img, i + 1))}</ul>}
        </div>
      )}
      {images.length < max && (
        <Button type="button" variant="outline" className="h-14 gap-2 text-lg" onClick={() => input.current?.click()}>
          <ImagePlus className="size-5" />
          {images.length ? t("addMore") : t("addCover")}
        </Button>
      )}
      {max > 1 && <p className="text-base text-muted-foreground">{t("limit", { count: images.length, max })}</p>}
      <CropDialog key={queue[0]?.file.name + queue.length + (queue[0]?.editId ?? "")} file={queue[0]?.file ?? null} onDone={cropped} onCancel={() => setQueue((q) => q.slice(1))} />
      <input ref={input} type="file" accept="image/*" multiple={max > 1 && images.length > 0} hidden onChange={(e) => add(e.target.files)} />
    </div>
  );
}
