"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Boton, cx, MuestraColor, Pastilla, Progreso, Tabla, Tarjeta, Vacio } from "@/components/ui";
import { FormularioVenta, type ContextoVenta } from "@/components/ventas/formulario-venta";
import { colorHex, estatusInfo } from "@/lib/dominio/catalogos";
import { fechaCorta } from "@/lib/dominio/fechas";
import type { Venta } from "@/lib/tipos";

export type AvanceVenta = { pct: number; hechos: number; total: number; siguiente: string | null; saldo: { texto: string; tono: "ok" | "bad" | "warn" | "neutro" } };

export function ListaVentas({ ventas, ctx, modelos, productos, nombres, mesTexto, abrirNueva, abiertas, avances }: {
  ventas: Venta[]; ctx: ContextoVenta; modelos: { id: string; nombre: string }[]; productos: { id: string; nombre: string; corto: string }[];
  nombres: Record<string, string>; mesTexto: string; abrirNueva: boolean; abiertas: boolean; avances: Record<string, AvanceVenta>;
}) {
  const router = useRouter();
  const [nueva, setNueva] = useState(abrirNueva);
  const [q, setQ] = useState("");
  const nombreModelo = useMemo(() => new Map(modelos.map((m) => [m.id, m.nombre])), [modelos]);
  const puedeRegistrar = ctx.yo.vende || ctx.direccion;
  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return ventas;
    return ventas.filter((v) => [v.cliente, v.vin, v.num_cliente, String(v.folio), nombreModelo.get(v.modelo_id)].join(" ").toLowerCase().includes(t));
  }, [q, ventas, nombreModelo]);
  const vivas = ventas.filter((v) => v.estatus !== "cancelada").length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-[1_1_260px] sm:max-w-[360px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente, VIN, folio o número de cliente" aria-label="Buscar ventas" className="campo pl-9" />
        </div>
        <span className="text-sm text-muted">{abiertas ? `${vivas} ${vivas === 1 ? "expediente abierto" : "expedientes abiertos"} (apartadas y facturadas)` : `${vivas} ${vivas === 1 ? "unidad" : "unidades"} en ${mesTexto}`}</span>
        <span className="flex-1" />
        {puedeRegistrar ? <Boton icono={Plus} onClick={() => setNueva(true)}>Registrar venta</Boton> : null}
      </div>

      {!filtradas.length ? (
        <Vacio titulo={q ? "Ninguna venta coincide con la búsqueda" : abiertas ? "No hay expedientes abiertos" : `Sin ventas en ${mesTexto}`}
          accion={!q && puedeRegistrar ? <Boton icono={Plus} onClick={() => setNueva(true)}>Registrar venta</Boton> : null}>
          Al registrar un cliente se abre su expediente: documentos de crédito, separación, factura, pagos, placas y hoja de salida.
        </Vacio>
      ) : (
        <Tarjeta className="p-2 sm:p-3">
          <Tabla>
            <thead>
              <tr>
                <th>Folio</th><th>Fecha</th><th>Cliente</th><th>VIN</th><th>Modelo</th><th>Color</th>
                {ctx.direccion ? <th>Vendedor</th> : null}
                <th>Expediente</th><th>Saldo</th><th>Productos</th><th>Estatus</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((v) => {
                const est = estatusInfo(v.estatus);
                return (
                  <tr key={v.id} onClick={() => router.push(`/ventas/${v.id}`)} className="cursor-pointer transition hover:bg-surface-2" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") router.push(`/ventas/${v.id}`); }}>
                    <td className="font-mono text-[0.8rem] text-muted">#{v.folio}</td>
                    <td className="whitespace-nowrap">{fechaCorta(v.fecha)}</td>
                    <td className="min-w-[160px]"><strong className="block">{v.cliente}</strong>{v.num_cliente ? <span className="text-[0.78rem] text-muted">Cliente {v.num_cliente}</span> : null}</td>
                    <td className="whitespace-nowrap font-mono text-[0.8rem]">{v.vin ?? "—"}</td>
                    <td className="whitespace-nowrap">{nombreModelo.get(v.modelo_id) ?? "—"}</td>
                    <td className="whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><MuestraColor hex={colorHex(v.color)} />{v.color}</span>{v.color_nombre ? <span className="block text-[0.76rem] text-muted">{v.color_nombre}</span> : null}</td>
                    {ctx.direccion ? <td>{nombres[v.vendedor_id] ?? "—"}</td> : null}
                    <td className="min-w-[150px]">
                      {avances[v.id] ? (
                        <span className="grid gap-1" title={avances[v.id].siguiente ? `Sigue: ${avances[v.id].siguiente}` : "Expediente completo"}>
                          <span className="flex items-center gap-2"><Progreso valor={avances[v.id].pct} className="h-1.5 flex-1" /><span className="text-[0.76rem] font-semibold text-muted">{avances[v.id].hechos}/{avances[v.id].total}</span></span>
                          <span className="max-w-[190px] truncate text-[0.74rem] text-muted">{v.estatus === "cancelada" ? "Cancelada" : avances[v.id].siguiente ? `Sigue: ${avances[v.id].siguiente}` : "Completo"}</span>
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap">
                      {avances[v.id] ? <span className={cx("text-[0.84rem] font-semibold", { ok: "text-ok", bad: "text-bad", warn: "text-warn", neutro: "font-normal text-muted" }[avances[v.id].saldo.tono])}>{avances[v.id].saldo.texto}</span> : null}
                    </td>
                    <td>
                      <span className="flex items-center gap-2" title={productos.filter((p) => v.productos.includes(p.id)).map((p) => p.nombre).join(", ") || "Sin productos"}>
                        <span className="flex gap-[3px]">{productos.map((p) => <i key={p.id} className={v.productos.includes(p.id) ? "size-2.5 rounded-[3px] bg-bar" : "size-2.5 rounded-[3px] bg-bar-track"} />)}</span>
                        <span className="text-[0.78rem] text-muted">{v.productos.length}/{productos.length}</span>
                      </span>
                    </td>
                    <td><Pastilla tono={est.tono}>{est.label}</Pastilla></td>
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
        </Tarjeta>
      )}
      <FormularioVenta abierto={nueva} alCerrar={() => { setNueva(false); if (abrirNueva) router.replace("/ventas", { scroll: false }); }} ctx={ctx}
        alGuardar={(id) => router.push(`/ventas/${id}`)} />
    </>
  );
}
