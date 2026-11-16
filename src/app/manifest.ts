import type { MetadataRoute } from "next";

// Installable PWA (SPEC §2).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vastra · Barwani",
    short_name: "Vastra",
    description: "Dresses for rent from Barwani shops, straight to WhatsApp.",
    start_url: "/",
    display: "standalone",
    background_color: "#472913",
    theme_color: "#472913",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
