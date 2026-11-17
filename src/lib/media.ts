// A product's media list: each slot is a photo or a video (slot 0 is the cover).
export type MediaKind = "image" | "video";
export type MediaItem = { kind: MediaKind; key: string; posterKey?: string | null };

export const VIDEO_TYPES = ["video/mp4", "video/quicktime"] as const;

export const isVideoKey = (key: string) => /\.(mp4|mov)$/.test(key);

/** The still image of a slot: a video's chosen frame, or the photo itself. */
export const stillKey = (m: { key: string; posterKey?: string | null }) => m.posterKey ?? m.key;

/** Trust-boundary check on what a seller submits. Throws on the first problem. */
export function checkMedia(items: MediaItem[], maxVideos: number) {
  let videos = 0;
  for (const m of items) {
    if (m.kind === "video") {
      videos++;
      if (!m.posterKey) throw new Error("video needs a poster");
      if (!isVideoKey(m.key)) throw new Error("video key is not a video file");
    } else {
      if (m.posterKey) throw new Error("image can't have a poster");
      if (isVideoKey(m.key)) throw new Error("image key is a video file");
    }
  }
  if (videos > maxVideos) throw new Error("too many videos");
}
