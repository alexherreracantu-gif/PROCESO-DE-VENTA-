import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Park Point · BYD Grupo TEC",
    short_name: "Park Point",
    description: "Portal interno de ventas del equipo.",
    start_url: "/inicio",
    display: "standalone",
    background_color: "#159be6",
    theme_color: "#0b1d2e",
    lang: "es-MX",
    icons: [
      { src: "/iconos/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/iconos/icono-512.png", sizes: "512x512", type: "image/png" },
      { src: "/iconos/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
