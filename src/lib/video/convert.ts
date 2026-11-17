// Browser only. Gets a picked video ready to upload: MP4 with H.264, within the upload size limit.
// mediabunny (WebCodecs) is loaded on first use, so it adds nothing to the page until a seller picks a video.

export type VideoLimits = { seconds: number; sourceMb: number; uploadMb: number };

/** `code` is a key in the "upload" messages ("video" + code); `values` fill its placeholders. */
export class VideoError extends Error {
  constructor(
    readonly code: "Bad" | "TooBig" | "TooLong" | "CantConvert",
    readonly values: Record<string, number> = {},
  ) {
    super(code);
  }
}

const AUDIO_BPS = 128_000;
const MAX_LONG_EDGE = 1080;

/** Video bits per second that keep `seconds` of footage (plus audio) inside ~85% of the upload limit, so the result always fits. */
export const videoBitrate = (uploadMb: number, seconds: number) =>
  Math.min(5_000_000, Math.max(1_000_000, Math.floor((uploadMb * 8_000_000 * 0.85) / Math.max(1, seconds)) - AUDIO_BPS));

/**
 * Reads the file, rejects it if too long or too big, and returns an MP4 (H.264 + AAC) to upload.
 * An H.264 file is only re-wrapped (near instant); HEVC, as iPhones record by default, is re-encoded.
 */
export async function prepareVideo(file: File, limits: VideoLimits, onProgress?: (done: number) => void): Promise<{ file: File; duration: number }> {
  if (file.size > limits.sourceMb * 1024 * 1024) throw new VideoError("TooBig", { mb: limits.sourceMb });
  const mb = await import("mediabunny");
  const input = new mb.Input({ formats: mb.ALL_FORMATS, source: new mb.BlobSource(file) });
  try {
    let duration: number;
    let track: Awaited<ReturnType<typeof input.getPrimaryVideoTrack>>;
    let codec: string | null = null;
    try {
      duration = await input.computeDuration();
      track = await input.getPrimaryVideoTrack();
      codec = (await track?.getCodec()) ?? null;
    } catch (e) {
      console.error(e);
      throw new VideoError("Bad");
    }
    if (!track || !Number.isFinite(duration) || duration <= 0) throw new VideoError("Bad");
    if (duration > limits.seconds) throw new VideoError("TooLong", { s: limits.seconds });

    const small = file.size <= limits.uploadMb * 1024 * 1024;
    if (file.type === "video/mp4" && codec === "avc" && small) return { file, duration };

    const transcode = codec !== "avc" || !small;
    if (transcode && !(await mb.canEncodeVideo("avc"))) throw new VideoError("CantConvert");

    // A long edge over 1080 px only costs size and time on a phone screen.
    const scale = Math.min(1, MAX_LONG_EDGE / Math.max(track.displayWidth, track.displayHeight));
    const size = scale < 1 ? (track.displayHeight >= track.displayWidth ? { height: Math.round((track.displayHeight * scale) / 2) * 2 } : { width: Math.round((track.displayWidth * scale) / 2) * 2 }) : {};
    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target: new mb.BufferTarget() });
    const conversion = await mb.Conversion.init({
      input,
      output,
      video: { codec: "avc", forceTranscode: transcode, ...(transcode ? { ...size, quality: new mb.Quality({ bitrate: videoBitrate(limits.uploadMb, duration) }) } : {}) },
      audio: { codec: "aac" },
    });
    // a dropped video track would leave a silent file, so any loss of it counts as failure
    if (!conversion.isValid || conversion.discardedTracks.some((d) => d.track.isVideoTrack())) throw new VideoError("CantConvert");
    conversion.onProgress = onProgress;
    try {
      await conversion.execute();
    } catch (e) {
      console.error(e);
      throw new VideoError("CantConvert");
    }

    const out = new File([output.target.buffer!], file.name.replace(/\.[^.]+$/, "") + ".mp4", { type: "video/mp4" });
    if (out.size > limits.uploadMb * 1024 * 1024) throw new VideoError("TooBig", { mb: limits.uploadMb });
    return { file: out, duration };
  } finally {
    input.dispose();
  }
}
