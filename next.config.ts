import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Disable in development — service workers + Next dev = debugging nightmare.
  disable: process.env.NODE_ENV !== "production",
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  experimental: {
    // Server actions are enabled by default; nothing to configure.
  },
};

export default withSerwist(nextConfig);
