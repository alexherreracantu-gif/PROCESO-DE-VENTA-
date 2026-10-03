"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton, Campo, Tabla } from "@/components/ui";
import { useAviso } from "@/components/cliente";
import type { EsquemaComision } from "@/lib/dominio/seguimiento";
import { guardarEsquema, guardarMetaIngreso } from "./acciones";

const txt = (v: number | null | undefined) => (v == null ? "" : String(v));
const num = (v: string) => (v.trim() === "" ? null : Number(v));

export function FormEsquema({ esquema, productos }: { esquema: EsquemaComision; productos: { clave: string; nombre: string; precio: number | null }[] }) {
  const router = useRouter();
  const avisar = useAviso();
  const [ocupado, iniciar] = useTransition();
  const [f, setF] = useState({ por_unidad: txt(esquema.por_unidad), pct_factura: txt(esquema.pct_factura), bono_meta: txt(esquema.bono_meta) });
  const [prod, setProd] = useState<Record<string, { fijo: string; pct: string }>>(() =>
    Object.fromEntries(productos.map((p) => [p.clave, { fijo: txt(esquema.productos?.[p.clave]?.fijo), pct: txt(esquema.productos?.[p.clave]?.pct) }])));
  const campo = (k: keyof typeof f, etiqueta: string, ayuda: string, paso = "1") => (
    <Campo etiqueta={etiqueta} htmlFor={`co-${k}`} ayuda={ayuda}>
      <input id={`co-${k}`} type="number" min={0} step={paso} inputMode="decimal" className="campo" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </Campo>
  );
  return (
    <form className="grid grid-cols-[minmax(0,1fr)] gap-5" onSubmit={(e) => { e.preventDefault(); iniciar(async () => {
      const r = await guardarEsquema({
        por_unidad: num(f.por_unidad), pct_factura: num(f.pct_factura), bono_meta: num(f.bono_meta),
        productos: Object.fromEntries(Object.entries(prod).map(([k, v]) => [k, { fijo: num(v.fijo), pct: num(v.pct) }])),
      });
      avisar(r.ok ? r.mensaje ?? "Guardado" : r.error, r.ok ? "ok" : "error");
      if (r.ok) router.refresh();
    }); }}>
      <div className="grid gap-4 sm:grid-cols-3">
        {campo("por_unidad", "Por unidad ($)", "Monto fijo por cada auto vendido.")}
        {campo("pct_factura", "% del valor factura", "Ej. 0.5 = medio por ciento. Déjalo vacío si no aplica.", "0.01")}
        {campo("bono_meta", "Bono por llegar a la meta ($)", "Se suma si el asesor cumple su meta de unidades del mes.")}
      </div>
      <div>
        <p className="mb-1 text-[0.8rem] font-semibold text-muted">Por producto vendido: monto fijo y/o % de su precio</p>
        <Tabla>
          <thead><tr><th>Producto</th><th>Precio de catálogo</th><th>Fijo ($)</th><th>% del precio</th></tr></thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.clave}>
                <td>{p.nombre}</td>
                <td className="text-muted">{p.precio ? `$${p.precio.toLocaleString("es-MX")}` : "—"}</td>
                <td><input aria-label={`${p.nombre} fijo`} type="number" min={0} step="1" inputMode="decimal" className="campo h-9 w-28" value={prod[p.clave]?.fijo ?? ""} onChange={(e) => setProd({ ...prod, [p.clave]: { ...prod[p.clave], fijo: e.target.value } })} /></td>
                <td><input aria-label={`${p.nombre} porcentaje`} type="number" min={0} max={100} step="0.1" inputMode="decimal" className="campo h-9 w-24" value={prod[p.clave]?.pct ?? ""} onChange={(e) => setProd({ ...prod, [p.clave]: { ...prod[p.clave], pct: e.target.value } })} /></td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </div>
      <div><Boton type="submit" disabled={ocupado}>{ocupado ? "Guardando…" : "Guardar esquema"}</Boton></div>
    </form>
  );
}

export function FormMeta({ meta }: { meta: number | null }) {
  const router = useRouter();
  const avisar = useAviso();
  const [v, setV] = useState(txt(meta));
  const [ocupado, iniciar] = useTransition();
  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); iniciar(async () => {
      const r = await guardarMetaIngreso(num(v));
      avisar(r.ok ? r.mensaje ?? "Guardado" : r.error, r.ok ? "ok" : "error");
      if (r.ok) router.refresh();
    }); }}>
      <Campo etiqueta="Tu meta de ingreso del mes" htmlFor="meta-ing" className="w-48">
        <input id="meta-ing" type="number" min={0} step="500" inputMode="decimal" className="campo" value={v} onChange={(e) => setV(e.target.value)} placeholder="Ej. 60000" />
      </Campo>
      <Boton type="submit" variante="secundario" disabled={ocupado}>{ocupado ? "…" : "Guardar meta"}</Boton>
    </form>
  );
}
