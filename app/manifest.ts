import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const m: MetadataRoute.Manifest & {
    share_target?: {
      action: string;
      method: string;
      enctype: string;
      params: {
        title?: string;
        text?: string;
        url?: string;
        files?: { name: string; accept: string[] }[];
      };
    };
  } = {
    name: "Baby Food",
    short_name: "Baby Food",
    description: "Plan, make, and log your baby's homemade meals.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#3f9d4a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["food", "health", "lifestyle"],
    share_target: {
      action: "/share-receive",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
        files: [{ name: "image", accept: ["image/*"] }],
      },
    },
  };
  return m;
}
