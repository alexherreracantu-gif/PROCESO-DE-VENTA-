"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { mesAnterior, nombreMes } from "@/lib/dominio/fechas";

function mesSiguiente(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
}

/** Cambia el mes en la URL conservando los demás filtros. */
export function SelectorMes({ mes, base, extra }: { mes: string; base: string; extra?: Record<string, string> }) {
  const router = useRouter();
  const ir = (m: string) => {
    const q = new URLSearchParams({ mes: m, ...(extra ?? {}) });
    router.push(`${base}?${q.toString()}`, { scroll: false });
  };
  const nombre = nombreMes(mes);
  return (
    <div className="inline-flex items-center rounded-xl border border-line bg-surface shadow-card">
      <button type="button" onClick={() => ir(mesAnterior(mes))} aria-label="Mes anterior" className="grid size-10 place-items-center rounded-l-xl text-muted hover:bg-surface-2 hover:text-fg"><ChevronLeft className="size-4" /></button>
      <label className="relative flex h-10 items-center px-2 text-[0.9rem] font-semibold">
        <span className="pointer-events-none capitalize">{nombre}</span>
        <input type="month" value={mes} aria-label="Mes" onChange={(e) => e.target.value && ir(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
      <button type="button" onClick={() => ir(mesSiguiente(mes))} aria-label="Mes siguiente" className="grid size-10 place-items-center rounded-r-xl text-muted hover:bg-surface-2 hover:text-fg"><ChevronRight className="size-4" /></button>
    </div>
  );
}
