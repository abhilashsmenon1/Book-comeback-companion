import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Book Comeback Companion",
    short_name: "Book Comeback",
    description: "Find your way back to the books you started.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8f5ee",
    theme_color: "#f8f5ee",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
