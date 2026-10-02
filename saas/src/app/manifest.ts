import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Park Point · BYD Cumbres",
    short_name: "Park Point",
    description: "Portal interno de ventas del equipo.",
    start_url: "/inicio",
    display: "standalone",
    background_color: "#0f1217",
    theme_color: "#0f1217",
    lang: "es-MX",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
