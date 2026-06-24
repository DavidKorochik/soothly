import type { MetadataRoute } from "next";

// PWA manifest: lets Soothly install to a home screen with the brand mark, RTL + Hebrew, on paper.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Soothly",
    short_name: "Soothly",
    description: "הסיפור שלך, כפי שנראה מבחוץ.",
    lang: "he",
    dir: "rtl",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f3ec",
    theme_color: "#f7f3ec",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
