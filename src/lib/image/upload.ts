import imageCompression from "browser-image-compression";

// Browser only. Every image is re-encoded through a canvas, which also strips EXIF (and GPS).
const OG_EDGE = 1200;
const OG_MAX_MB = 0.29; // WhatsApp drops previews over ~300 KB

async function toJpeg(file: File, edge: number, maxSizeMB?: number) {
  return imageCompression(file, { maxWidthOrHeight: edge, fileType: "image/jpeg", initialQuality: 0.85, maxSizeMB, useWebWorker: true });
}

/** Main WebP (JPEG on WebViews that can't encode WebP) plus the OG JPEG. `ogOnly` returns just the JPEG as main. */
export async function compressImage(file: File, maxEdge: number, ogOnly = false): Promise<{ main: File; og?: File }> {
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
