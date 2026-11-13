import { ImageResponse } from "next/og";

// The wordmark's tent-stripe square as the installed-app icon (192 and 512 px).
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = (await params).size === "512" ? 512 : 192;
  const bar = size / 6;
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#c79a3e" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: bar, height: "100%", marginLeft: bar, background: "#472913" }} />
        ))}
      </div>
    ),
    { width: size, height: size, headers: { "cache-control": "public, max-age=604800, immutable" } },
  );
}
