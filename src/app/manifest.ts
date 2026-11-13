import type { MetadataRoute } from "next";

// Installable PWA (SPEC §2).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rentals · Barwani",
    short_name: "Rentals",
    description: "Dresses for rent from Barwani shops, straight to WhatsApp.",
    start_url: "/",
    display: "standalone",
    background_color: "#472913",
    theme_color: "#472913",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
