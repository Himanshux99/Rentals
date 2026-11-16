import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// cacheComponents is off: every page reads the locale cookie, so nothing here is statically cacheable.
const storageBase = process.env.STORAGE_PUBLIC_BASE_URL;
const nextConfig: NextConfig = {
  // R2 images are optimised by next/image; local uploads are same-origin (/api/dev-files) and need no pattern.
  images: { remotePatterns: storageBase ? [new URL(`${storageBase.replace(/\/$/, "")}/**`)] : [], formats: ["image/webp"] },
  // Browsers re-check the favicon on every client navigation; cache brand files so they skip the 304 round-trip.
  // shortcut: unhashed names, so a changed icon can take a week to show; rename the file when you replace it.
  async headers() {
    return [{ source: "/brand/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] }];
  },
  // Every user agent gets blocking metadata, so generateMetadata tags land in <head> instead of streaming into <body>.
  // Costs one generateMetadata round-trip of TTFB on dynamic pages (the product page's lookup is the slowest).
  htmlLimitedBots: /.*/,
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
