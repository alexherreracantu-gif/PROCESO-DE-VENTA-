"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Boton } from "@/components/ui";
import { useAviso } from "@/components/cliente";
import { guardarInversion } from "./acciones";

export function FormInversion({ mes, inicial }: { mes: string; inicial: { canal: string; monto: number | null }[] }) {
  const router = useRouter();
  const avisar = useAviso();
  const [filas, setFilas] = useState(inicial.map((f) => ({ canal: f.canal, monto: f.monto == null ? "" : String(f.monto) })));
  const [nuevo, setNuevo] = useState("");
  const [ocupado, iniciar] = useTransition();
  return (
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); iniciar(async () => {
      const r = await guardarInversion(mes, filas.map((f) => ({ canal: f.canal, monto: f.monto.trim() === "" ? null : Number(f.monto) })));
      avisar(r.ok ? r.mensaje ?? "Guardado" : r.error, r.ok ? "ok" : "error");
      if (r.ok) router.refresh();
    }); }}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filas.map((f, i) => (
          <label key={f.canal} className="grid gap-1.5">
            <span className="text-[0.8rem] font-semibold text-muted">{f.canal}</span>
            <span className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
              <input type="number" min={0} step="1" inputMode="decimal" className="campo pl-7" value={f.monto} placeholder="0"
                onChange={(e) => setFilas(filas.map((x, j) => (j === i ? { ...x, monto: e.target.value } : x)))} />
            </span>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Boton type="submit" disabled={ocupado}>{ocupado ? "Guardando…" : "Guardar inversión"}</Boton>
        <span className="flex-1" />
        <input className="campo h-9 w-44" placeholder="Otro canal (ej. TikTok)" value={nuevo} maxLength={40} onChange={(e) => setNuevo(e.target.value)} aria-label="Nombre del canal nuevo" />
        <Boton variante="secundario" tamano="sm" icono={Plus} disabled={!nuevo.trim() || filas.some((f) => f.canal.toLowerCase() === nuevo.trim().toLowerCase())}
          onClick={() => { setFilas([...filas, { canal: nuevo.trim(), monto: "" }]); setNuevo(""); }}>Agregar canal</Boton>
      </div>
    </form>
  );
}
