import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage signed URLs
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
  },
};

export default withSerwist(nextConfig);

// Expose Cloudflare bindings (env, KV, R2, etc.) to `next dev`.
// Safe to call unconditionally — it no-ops outside dev.
if (process.env.NODE_ENV === "development") {
  // Lazy import so prod builds don't pull in the dev helper.
  void import("@opennextjs/cloudflare").then(({ initOpenNextCloudflareForDev }) =>
    initOpenNextCloudflareForDev(),
  );
}
