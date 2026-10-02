import type { Metadata, Viewport } from "next";
import { ProveedorAvisos } from "@/components/cliente";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Park Point", template: "%s · Park Point" },
  description: "Portal interno de ventas de BYD Cumbres · Park Point.",
  robots: { index: false, follow: false },
  appleWebApp: { title: "Park Point", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#0b1d2e" }, { media: "(prefers-color-scheme: dark)", color: "#07131f" }],
  viewportFit: "cover",
};

// Aplica el tema guardado antes de pintar para que no parpadee.
const scriptTema = `try{var t=localStorage.getItem("tema");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-dvh">
        <ProveedorAvisos>{children}</ProveedorAvisos>
      </body>
    </html>
  );
}
