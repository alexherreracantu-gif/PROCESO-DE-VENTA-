"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Barra delgada de progreso arriba de la pantalla al cambiar de sección.
 * Avanza mientras carga y se completa en cuanto cambia la ruta.
 */
export function BarraNavegacion() {
  const ruta = usePathname();
  const [desde, setDesde] = useState<string | null>(null);

  useEffect(() => {
    // En fase de captura: los enlaces de Next cancelan el clic (preventDefault) antes de que suba al documento.
    const clic = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target || a.hasAttribute("download")) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || u.pathname === location.pathname || u.pathname.startsWith("/api/")) return;
      setDesde(location.pathname);
    };
    document.addEventListener("click", clic, true);
    return () => document.removeEventListener("click", clic, true);
  }, []);

  if (desde === null) return null;
  const cargando = desde === ruta;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[3px]">
      <div key={cargando ? "carga" : "fin"} className={cargando ? "carga-avanza" : "carga-termina"}
        onAnimationEnd={() => { if (!cargando) setDesde(null); }} />
    </div>
  );
}
