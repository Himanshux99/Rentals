import imageCompression from "browser-image-compression";

// Browser only. Every image is re-encoded through a canvas, which also strips EXIF (and GPS).
const OG_EDGE = 1200;
const OG_MAX_MB = 0.29; // WhatsApp drops previews over ~300 KB

async function toJpeg(file: File, edge: number, maxSizeMB?: number) {
  return imageCompression(file, { maxWidthOrHeight: edge, fileType: "image/jpeg", initialQuality: 0.85, maxSizeMB, useWebWorker: true });
}

/** Centre the photo on a square canvas; padding is white for light photos, black for dark ones (judged by the photo's average brightness). */
async function padSquare(file: File): Promise<File> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.max(bmp.width, bmp.height);
  if (bmp.width === bmp.height) return file;
  const c = document.createElement("canvas");
  c.width = c.height = side;
  const ctx = c.getContext("2d")!;
  const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
  probe.drawImage(bmp, 0, 0, 1, 1); // 1x1 downscale = average colour
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  ctx.fillStyle = (r * 299 + g * 587 + b * 114) / 1000 > 128 ? "#fff" : "#000";
  ctx.fillRect(0, 0, side, side);
  ctx.drawImage(bmp, (side - bmp.width) / 2, (side - bmp.height) / 2);
  bmp.close();
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", 0.95));
  if (!blob) throw new Error("pad failed");
  return new File([blob], "square.jpg", { type: "image/jpeg" });
}

/** Main WebP (JPEG on WebViews that can't encode WebP) plus the OG JPEG. `ogOnly` returns just the JPEG as main. Product photos are padded to 1:1 first. */
export async function compressImage(input: File, maxEdge: number, ogOnly = false): Promise<{ main: File; og?: File }> {
  const file = ogOnly ? input : await padSquare(input);
  const og = await toJpeg(file, OG_EDGE, OG_MAX_MB);
  if (ogOnly) return { main: og };
  let main = await imageCompression(file, { maxWidthOrHeight: maxEdge, fileType: "image/webp", initialQuality: 0.8, useWebWorker: true });
  // canvas.toBlob hands back PNG when WebP encoding is missing
  if (main.type !== "image/webp") main = await toJpeg(file, maxEdge);
  return { main, og };
}

function putOnce(url: string, body: Blob, onProgress: (loaded: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", body.type);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`upload ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(body);
  });
}

/** PUT to a signed URL, with progress and one retry. */
export async function putFile(url: string, body: Blob, onProgress: (loaded: number) => void) {
  try {
    await putOnce(url, body, onProgress);
  } catch {
    onProgress(0);
    await putOnce(url, body, onProgress);
  }
}
