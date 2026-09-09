import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShorePass 自考英语",
    short_name: "ShorePass",
    description: "自考英语练习与错题复习",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8f5",
    theme_color: "#187568",
    lang: "zh-CN",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
