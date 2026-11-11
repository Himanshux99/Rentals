import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// cacheComponents is off: every page reads the locale cookie, so nothing here is statically cacheable.
const nextConfig: NextConfig = {
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
