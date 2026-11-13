import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// cacheComponents is off: every page reads the locale cookie, so nothing here is statically cacheable.
const storageBase = process.env.STORAGE_PUBLIC_BASE_URL;
const nextConfig: NextConfig = {
  // R2 images are optimised by next/image; local uploads are same-origin (/api/dev-files) and need no pattern.
  images: { remotePatterns: storageBase ? [new URL(`${storageBase.replace(/\/$/, "")}/**`)] : [], formats: ["image/webp"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default createNextIntlPlugin()(nextConfig);
