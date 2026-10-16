import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Reopening a tab seen in the last 30 s is instant (no trip to the server).
    // Every save clears this cache (lib/changed.ts), so numbers never go stale after a save.
    staleTimes: { dynamic: 30 },
  },
  // Lets a phone on the same Wi-Fi load the dev server by the laptop's LAN IP.
  // Only affects `npm run dev`, never the live site.
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "172.*.*.*"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
