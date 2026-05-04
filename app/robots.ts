import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy"],
        disallow: ["/dashboard", "/inventory", "/feedings", "/settings", "/admin", "/api"],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
