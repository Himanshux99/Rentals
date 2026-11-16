import imageCompression from "browser-image-compression";

// Browser only. Every image is re-encoded through a canvas, which also strips EXIF (and GPS).
const OG_EDGE = 1200;
const OG_MAX_MB = 0.29; // WhatsApp drops previews over ~300 KB

async function toJpeg(file: File, edge: number, maxSizeMB?: number) {
  return imageCompression(file, { maxWidthOrHeight: edge, fileType: "image/jpeg", initialQuality: 0.85, maxSizeMB, useWebWorker: true });
}

/** Most common colour in a pixel strip: pixels are bucketed to 16 levels per channel, then the winning bucket is averaged. */
function dominant(data: Uint8ClampedArray): string {
  const buckets = new Map<number, [number, number, number, number]>();
  for (let i = 0; i < data.length; i += 4) {
    const k = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const e = buckets.get(k) ?? [0, 0, 0, 0];
    e[0]++;
    e[1] += data[i];
    e[2] += data[i + 1];
    e[3] += data[i + 2];
    buckets.set(k, e);
  }
  const [n, r, g, b] = [...buckets.values()].reduce((best, e) => (e[0] > best[0] ? e : best));
  return `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`;
}

/** Centre the photo on a square canvas. Each padded side takes the most common colour of the photo's nearest 10% edge strip. */
async function padSquare(file: File): Promise<File> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width: w, height: h } = bmp;
  if (w === h) return file;
  const side = Math.max(w, h);
  const [x, y] = [(side - w) / 2, (side - h) / 2];

  // Sample a small copy so the strips are cheap to read.
  const k = Math.min(1, 100 / side);
  const [sw, sh] = [Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))];
  const probe = document.createElement("canvas");
  probe.width = sw;
  probe.height = sh;
  const pctx = probe.getContext("2d", { willReadFrequently: true })!;
  pctx.drawImage(bmp, 0, 0, sw, sh);
  const [tall, wide] = [Math.max(1, Math.round(sh * 0.1)), Math.max(1, Math.round(sw * 0.1))];
  const strip = (sx: number, sy: number, a: number, b: number) => dominant(pctx.getImageData(sx, sy, a, b).data);

  const c = document.createElement("canvas");
  c.width = c.height = side;
  const ctx = c.getContext("2d")!;
  if (y > 0) {
    ctx.fillStyle = strip(0, 0, sw, tall); // top
    ctx.fillRect(0, 0, side, y);
    ctx.fillStyle = strip(0, sh - tall, sw, tall); // bottom
    ctx.fillRect(0, y + h, side, side - y - h);
  } else {
    ctx.fillStyle = strip(0, 0, wide, sh); // left
    ctx.fillRect(0, 0, x, side);
    ctx.fillStyle = strip(sw - wide, 0, wide, sh); // right
    ctx.fillRect(x + w, 0, side - x - w, side);
  }
  ctx.drawImage(bmp, x, y);
  bmp.close();
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", 0.95));
  if (!blob) throw new Error("pad failed");
  return new File([blob], "square.jpg", { type: "image/jpeg" });
}

/** Fit the photo inside a 1200x630 (1.91:1) card, the ratio WhatsApp and Facebook want. Bars take the dominant colour of the nearest photo edge. */
async function ogCard(file: File): Promise<File> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const [W, H] = [OG_EDGE, 630];
  const s = Math.min(W / bmp.width, H / bmp.height);
  const [w, h] = [Math.round(bmp.width * s), Math.round(bmp.height * s)];
  const [x, y] = [(W - w) >> 1, (H - h) >> 1];
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bmp, x, y, w, h);
  bmp.close();
  const edge = (sx: number, sy: number, a: number, b: number) => dominant(ctx.getImageData(sx, sy, Math.max(1, a), Math.max(1, b)).data);
  if (x > 0) {
    const t = Math.round(w * 0.1);
    ctx.fillStyle = edge(x, 0, t, H); // left
    ctx.fillRect(0, 0, x, H);
    ctx.fillStyle = edge(x + w - t, 0, t, H); // right
    ctx.fillRect(x + w, 0, W - x - w, H);
  } else if (y > 0) {
    const t = Math.round(h * 0.1);
    ctx.fillStyle = edge(0, y, W, t); // top
    ctx.fillRect(0, 0, W, y);
    ctx.fillStyle = edge(0, y + h - t, W, t); // bottom
    ctx.fillRect(0, y + h, W, H - y - h);
  }
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", 0.95));
  if (!blob) throw new Error("og card failed");
  return new File([blob], "og.jpg", { type: "image/jpeg" });
}

/** Main WebP (JPEG on WebViews that can't encode WebP) plus the OG JPEG (1200x630). `ogOnly` returns just the JPEG as main. Product photos are padded to 1:1 first. */
export async function compressImage(input: File, maxEdge: number, ogOnly = false): Promise<{ main: File; og?: File }> {
  const file = ogOnly ? input : await padSquare(input);
  const og = await toJpeg(ogOnly ? file : await ogCard(file), OG_EDGE, OG_MAX_MB);
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
