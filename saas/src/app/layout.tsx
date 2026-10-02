import type { Metadata, Viewport } from "next";
import { ProveedorAvisos } from "@/components/cliente";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Park Point", template: "%s · Park Point" },
  description: "Portal interno de ventas de BYD Cumbres · Park Point.",
  robots: { index: false, follow: false },
  appleWebApp: { title: "Park Point", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX">
      <body className="min-h-dvh">
        <ProveedorAvisos>{children}</ProveedorAvisos>
      </body>
    </html>
  );
}
