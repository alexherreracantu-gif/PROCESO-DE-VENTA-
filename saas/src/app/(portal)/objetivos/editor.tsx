"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Save } from "lucide-react";
import { Boton, Pastilla, Progreso, Tabla, Tarjeta, TituloTarjeta, cx } from "@/components/ui";
import { useAviso } from "@/components/cliente";
import { decimal, porcentaje } from "@/lib/dominio/formato";
import { guardarMetas } from "./acciones";

type FilaVendedor = { id: string; nombre: string; rol: string; vendidas: number; meta: number; yo: boolean };
type FilaProducto = { id: string; nombre: string; real: number | null; meta: number };

export function EditorMetas({ mes, mesTexto, vendedores, productos, editable, diasRestantes, mesActual, etiquetaReal }: {
  mes: string; mesTexto: string; vendedores: FilaVendedor[]; productos: FilaProducto[]; editable: boolean; diasRestantes: number; mesActual: boolean; etiquetaReal: string;
}) {
  const router = useRouter();
  const avisar = useAviso();
  const [ocupado, iniciar] = useTransition();
  const inicialU = Object.fromEntries(vendedores.map((v) => [v.id, String(v.meta)]));
  const inicialP = Object.fromEntries(productos.map((p) => [p.id, String(p.meta)]));
  const [u, setU] = useState(inicialU);
  const [p, setP] = useState(inicialP);
  const cambios = JSON.stringify(u) !== JSON.stringify(inicialU) || JSON.stringify(p) !== JSON.stringify(inicialP);
  const num = (x: string, max: number) => Math.min(max, Math.max(0, Math.round(Number(x) || 0)));
  const metaDe = (id: string) => (editable ? num(u[id], 999) : vendedores.find((v) => v.id === id)!.meta);
  const totalMeta = vendedores.reduce((t, v) => t + metaDe(v.id), 0);
  const totalVendidas = vendedores.reduce((t, v) => t + v.vendidas, 0);

  function guardar() {
    iniciar(async () => {
      const r = await guardarMetas({ mes, unidades: Object.fromEntries(Object.entries(u).map(([k, v]) => [k, num(v, 999)])), productos: Object.fromEntries(Object.entries(p).map(([k, v]) => [k, num(v, 100)])) });
      if (!r.ok) { avisar(r.error, "error"); return; }
      avisar(r.mensaje ?? "Guardado");
      router.refresh();
    });
  }

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Tarjeta>
          <TituloTarjeta titulo="Unidades por vendedor">{mesActual ? <Pastilla>{diasRestantes} días restantes</Pastilla> : null}</TituloTarjeta>
          <Tabla>
            <thead><tr><th>Vendedor</th><th className="!text-right">Meta</th><th className="!text-right">Vendidas</th><th className="w-[30%]">Avance</th><th className="!text-right">Faltan</th><th className="!text-right max-sm:hidden">Ritmo/sem.</th></tr></thead>
            <tbody>
              {vendedores.map((v) => {
                const meta = metaDe(v.id), faltan = Math.max(meta - v.vendidas, 0);
                return (
                  <tr key={v.id} className={cx(v.yo && "font-semibold")}>
                    <td className="whitespace-nowrap">{v.nombre}<span className="block text-[0.74rem] font-normal text-muted">{v.rol}</span></td>
                    <td className="text-right">{editable ? <input type="number" min={0} max={999} inputMode="numeric" aria-label={`Meta de ${v.nombre}`} className="campo h-9 w-[76px] text-right" value={u[v.id]} onChange={(e) => setU({ ...u, [v.id]: e.target.value })} /> : meta}</td>
                    <td className="text-right">{v.vendidas}</td>
                    <td><Progreso valor={meta ? v.vendidas / meta : 0} className="h-2.5" /></td>
                    <td className="text-right">{faltan ? faltan : <Pastilla tono="ok">Cumplida</Pastilla>}</td>
                    <td className="text-right max-sm:hidden">{faltan && mesActual ? decimal(faltan / Math.max(diasRestantes / 7, 1 / 7)) : "—"}</td>
                  </tr>
                );
              })}
              <tr className="font-semibold">
                <td>Equipo</td><td className="text-right">{totalMeta}</td><td className="text-right">{totalVendidas}</td>
                <td><Progreso valor={totalMeta ? totalVendidas / totalMeta : 0} className="h-2.5" /></td>
                <td className="text-right">{Math.max(totalMeta - totalVendidas, 0)}</td><td className="max-sm:hidden" />
              </tr>
            </tbody>
          </Tabla>
        </Tarjeta>
        <Tarjeta>
          <TituloTarjeta titulo="Penetración por producto" nota={etiquetaReal} />
          <Tabla>
            <thead><tr><th>Producto</th><th className="!text-right">Meta %</th><th className="w-[38%]">Avance</th><th className="!text-right">Real</th></tr></thead>
            <tbody>
              {productos.map((x) => {
                const meta = editable ? num(p[x.id], 100) : x.meta;
                return (
                  <tr key={x.id}>
                    <td>{x.nombre}</td>
                    <td className="text-right">{editable ? <input type="number" min={0} max={100} inputMode="numeric" aria-label={`Meta de ${x.nombre}`} className="campo h-9 w-[70px] text-right" value={p[x.id]} onChange={(e) => setP({ ...p, [x.id]: e.target.value })} /> : `${meta}%`}</td>
                    <td>
                      <span className="relative block h-2.5 rounded bg-bar-track">
                        {x.real ? <i className="absolute inset-y-0 left-0 rounded bg-bar" style={{ width: `${Math.min(x.real, 1) * 100}%` }} /> : null}
                        <b className="absolute -inset-y-1 w-0.5 bg-fg" style={{ left: `calc(${meta}% - 1px)` }} />
                      </span>
                    </td>
                    <td className="text-right">{x.real == null ? "—" : <Pastilla tono={x.real * 100 >= meta ? "ok" : "warn"}>{porcentaje(x.real)}</Pastilla>}</td>
                  </tr>
                );
              })}
            </tbody>
          </Tabla>
        </Tarjeta>
      </div>
      {editable ? (
        <div className="flex flex-wrap items-center gap-2">
          <Boton icono={Save} onClick={guardar} disabled={ocupado || !cambios}>{ocupado ? "Guardando…" : `Guardar metas de ${mesTexto}`}</Boton>
          {cambios ? <Boton variante="secundario" icono={RotateCcw} onClick={() => { setU(inicialU); setP(inicialP); }}>Deshacer cambios</Boton> : <span className="text-sm text-muted">Cambia cualquier número para editar.</span>}
        </div>
      ) : null}
    </>
  );
}
