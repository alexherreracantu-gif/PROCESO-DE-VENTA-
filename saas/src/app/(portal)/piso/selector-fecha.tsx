"use client";

import { useRouter } from "next/navigation";

export function SelectorFecha({ fecha }: { fecha: string }) {
  const router = useRouter();
  return <input type="date" aria-label="Fecha del corte" className="campo w-auto" value={fecha} onChange={(e) => e.target.value && router.push(`/piso?fecha=${e.target.value}`, { scroll: false })} />;
}
