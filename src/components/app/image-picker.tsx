"use client";
import { useRef, useState } from "react";
import { CropDialog } from "@/components/app/crop-dialog";
import { FrameDialog } from "@/components/app/frame-dialog";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Crop, Film, ImagePlus, Play, TriangleAlert, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { compressImage, putFile, videoDuration } from "@/lib/image/upload";
import { VIDEO_TYPES } from "@/lib/media";
import { discardUpload, signUpload, signVideo, type UploadScope } from "@/app/seller/uploads";

/** A photo or video in the picker. `key` is set once all its files are in storage. A video's `preview` is its chosen frame, and `original` its file while it is still in this browser session (needed to re-pick the frame). */
export type PickedImage = { id: string; kind?: "image" | "video"; original?: File; preview: string; key?: string; posterKey?: string; ogKey?: string; progress: number; failed?: boolean };

/** Limits for videos; leave `video` out for photo-only pickers (shop photo). */
export type VideoLimits = { max: number; mb: number; seconds: number };

type Props = {
  scope: UploadScope;
  max: number;
  maxEdge: number;
  images: PickedImage[];
  setImages: (fn: (prev: PickedImage[]) => PickedImage[]) => void;
  video?: VideoLimits;
};

type VideoJob = { file: File; duration: number; editId?: string };

const keysOf = (i: PickedImage) => [i.key, i.posterKey, i.ogKey].filter((k): k is string => !!k);

/** Pick from camera or gallery, compress in the browser, upload straight to storage. First item is the cover. */
export function ImagePicker({ scope, max, maxEdge, images, setImages, video }: Props) {
  const t = useTranslations("upload");
  const input = useRef<HTMLInputElement>(null);
  // `editId` is set when re-cropping a photo that is already in the list.
  const [queue, setQueue] = useState<{ file: File; editId?: string }[]>([]);
  const [videoQueue, setVideoQueue] = useState<VideoJob[]>([]);
  const [error, setError] = useState<string>();
  // The picked photos, kept for re-cropping in this session.
  const originals = useRef(new Map<string, File>());

  const patch = (id: string, p: Partial<PickedImage>) => setImages((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)));
  const videoCount = images.filter((i) => i.kind === "video").length;

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

  // The video goes up as picked; the chosen frame becomes the poster and the 1200x630 preview.
  async function uploadVideo(file: File, frame: File, id: string) {
    try {
      const { main: poster, og } = await compressImage(frame, maxEdge, false, false);
      const signed = await signVideo({ type: file.type, bytes: file.size }, { type: poster.type, bytes: poster.size }, { type: og!.type, bytes: og!.size });
      const sizes = [file.size, poster.size, og!.size];
      const total = sizes[0] + sizes[1] + sizes[2];
      const loaded = [0, 0, 0];
      const report = (slot: number) => (n: number) => {
        loaded[slot] = n;
        patch(id, { progress: Math.min(99, Math.round(((loaded[0] + loaded[1] + loaded[2]) / total) * 100)) });
      };
      await Promise.all([putFile(signed.url, file, report(0)), putFile(signed.posterUrl, poster, report(1)), putFile(signed.ogUrl, og!, report(2))]);
      patch(id, { key: signed.key, posterKey: signed.posterKey, ogKey: signed.ogKey, progress: 100 });
    } catch (e) {
      console.error(e);
      patch(id, { failed: true });
    }
  }

  // Re-framing keeps the video already in storage and replaces only the poster and preview.
  async function reframe(id: string, frame: File) {
    try {
      const { main: poster, og } = await compressImage(frame, maxEdge, false, false);
      const signed = await signUpload(scope, { type: poster.type, bytes: poster.size }, { type: og!.type, bytes: og!.size });
      await Promise.all([putFile(signed.url, poster, () => {}), putFile(signed.ogUrl!, og!, () => {})]);
      patch(id, { posterKey: signed.key, ogKey: signed.ogKey, progress: 100 });
    } catch (e) {
      console.error(e);
      patch(id, { failed: true });
    }
  }

  async function checkVideo(file: File): Promise<VideoJob | undefined> {
    if (!video) return;
    if (!(VIDEO_TYPES as readonly string[]).includes(file.type)) return setError(t("videoBad")), undefined;
    if (file.size > video.mb * 1024 * 1024) return setError(t("videoTooBig", { mb: video.mb })), undefined;
    try {
      const duration = await videoDuration(file);
      if (!Number.isFinite(duration)) throw new Error("no duration");
      if (duration > video.seconds) return setError(t("videoTooLong", { s: video.seconds })), undefined;
      return { file, duration };
    } catch (e) {
      console.error(e);
      setError(t("videoBad"));
    }
  }

  // Any photo uploads as picked (padded to 1:1 in compressImage); crop it later with the edit icon or a tap. Videos go through the frame dialog first.
  async function add(files: FileList | null) {
    const picked = [...(files ?? [])].slice(0, max - images.length);
    if (input.current) input.current.value = "";
    setError(undefined);
    const photos = picked.filter((f) => !f.type.startsWith("video/"));
    const videos = picked.filter((f) => f.type.startsWith("video/"));
    const added = photos.map((file) => ({ file, id: crypto.randomUUID() }));
    added.forEach(({ file, id }) => originals.current.set(id, file));
    setImages((prev) => [...prev, ...added.map(({ file, id }) => ({ id, kind: "image" as const, preview: URL.createObjectURL(file), progress: 0 }))]);
    added.forEach(({ file, id }) => upload(file, id));

    const room = video ? video.max - videoCount : 0;
    if (videos.length > room) setError(t("videoLimit", { max: video?.max ?? 0 }));
    const jobs = (await Promise.all(videos.slice(0, Math.max(0, room)).map(checkVideo))).filter((j): j is VideoJob => !!j);
    if (jobs.length) setVideoQueue((q) => [...q, ...jobs]);
  }

  function framed(frame: File) {
    const { file, editId } = videoQueue[0];
    setVideoQueue((q) => q.slice(1));
    if (editId) {
      const old = images.find((i) => i.id === editId);
      if (old) {
        URL.revokeObjectURL(old.preview);
        const stale = [old.posterKey, old.ogKey].filter((k): k is string => !!k);
        if (stale.length) discardUpload(scope, stale).catch(console.error);
      }
      patch(editId, { preview: URL.createObjectURL(frame), posterKey: undefined, ogKey: undefined, progress: 0, failed: false });
      // the video is already stored; only the frame is replaced
      return void reframe(editId, frame);
    }
    const id = crypto.randomUUID();
    setImages((prev) => [...prev, { id, kind: "video", original: file, preview: URL.createObjectURL(frame), progress: 0 }]);
    uploadVideo(file, frame, id);
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
        const keys = keysOf(old);
        if (keys.length) discardUpload(scope, keys).catch(console.error);
      }
      patch(id, { preview, key: undefined, ogKey: undefined, progress: 0, failed: false });
    } else {
      setImages((prev) => [...prev, { id, kind: "image", preview, progress: 0 }]);
    }
    upload(file, id);
    setQueue((q) => q.slice(1));
  }

  async function edit(img: PickedImage) {
    try {
      if (img.kind === "video") {
        // shortcut: a saved video can't be re-framed (its file isn't in the browser any more); remove it and add it again
        if (!img.original) return;
        setVideoQueue([{ file: img.original, duration: await videoDuration(img.original), editId: img.id }]);
        return;
      }
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
    const keys = keysOf(img);
    if (keys.length) discardUpload(scope, keys).catch(console.error);
  }

  function move(index: number, by: number) {
    setImages((prev) => {
      const next = [...prev];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });
  }

  // Photos are stored as 1:1 squares, so show them in a square box (the padding appears as the grey background here). A video shows its frame, uncropped.
  function tile(img: PickedImage, i: number) {
    const isCover = i === 0;
    const isVideo = img.kind === "video";
    const canEdit = !isVideo || !!img.original;
    return (
      <li key={img.id} className="flex flex-col gap-1 bg-muted">
        <div className="relative aspect-square overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
          <img src={img.preview} alt={t(isVideo ? "video" : "photo", { n: i + 1 })} className="size-full object-contain" />
          {(img.key || img.failed) && canEdit && <button type="button" className="absolute inset-0" onClick={() => edit(img)} aria-label={t(isVideo ? "editFrame" : "edit")} />}
          {isCover && max > 1 && <Badge className="absolute left-1 top-1 bg-primary text-primary-foreground">{t("cover")}</Badge>}
          {isVideo && (
            <Badge className="absolute bottom-1 left-1 gap-1 bg-black/70 text-white">
              <Play className="size-3.5" />
              {t("video", { n: "" }).trim()}
            </Badge>
          )}
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
          {canEdit && (
            <Button type="button" variant="ghost" className="h-12 flex-1" disabled={!img.key && !img.failed} onClick={() => edit(img)} aria-label={t(isVideo ? "editFrame" : "edit")}>
              {isVideo ? <Film className="size-5" /> : <Crop className="size-5" />}
            </Button>
          )}
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
          {video ? (images.length ? t("addMoreMedia") : t("addCoverMedia")) : images.length ? t("addMore") : t("addCover")}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-base text-destructive">
          {error}
        </p>
      )}
      {max > 1 && <p className="text-base text-muted-foreground">{video ? t("limitMedia", { count: images.length, max }) : t("limit", { count: images.length, max })}</p>}
      <CropDialog key={queue[0]?.file.name + queue.length + (queue[0]?.editId ?? "")} file={queue[0]?.file ?? null} onDone={cropped} onCancel={() => setQueue((q) => q.slice(1))} />
      <FrameDialog
        key={(videoQueue[0]?.file.name ?? "") + videoQueue.length + (videoQueue[0]?.editId ?? "")}
        file={videoQueue[0]?.file ?? null}
        duration={videoQueue[0]?.duration ?? 0}
        onDone={framed}
        onCancel={() => setVideoQueue((q) => q.slice(1))}
      />
      <input ref={input} type="file" accept={video ? "image/*,video/mp4,video/quicktime" : "image/*"} multiple={max > 1 && images.length > 0} hidden onChange={(e) => add(e.target.files)} />
    </div>
  );
}
