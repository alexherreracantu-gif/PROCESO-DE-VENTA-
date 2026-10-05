import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: { position: "bottom-right" },
  poweredByHeader: false,
  // Las fotos de los modelos se suben comprimidas desde el navegador (≈ 300 KB + miniatura).
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  // Presentación del convenio con Energon (cifrada, con contraseña): tools/cifrar-convenio.mjs.
  async rewrites() {
    return [{ source: "/convenio", destination: "/convenio/index.html" }];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
