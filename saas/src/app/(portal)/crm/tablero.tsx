"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CarFront, Plus, Search, Trash2 } from "lucide-react";
import { Boton, BotonEnlace, Campo, Pastilla, Vacio, cx } from "@/components/ui";
import { Confirmar, Dialogo, useAviso } from "@/components/cliente";
import { FormularioVenta, type ContextoVenta, type Prefill } from "@/components/ventas/formulario-venta";
import { CALORES, ETAPAS, ETAPAS_CERRADAS, ORIGENES, type Calor } from "@/lib/dominio/catalogos";
import { fechaCorta } from "@/lib/dominio/fechas";
import { dinero, enlaceWhatsApp } from "@/lib/dominio/formato";
import { borrarProspecto, guardarProspecto, moverEtapa, type EntradaProspecto } from "./acciones";
import type { Prospecto } from "@/lib/tipos";

const TONO_CALOR: Record<Calor, "warn" | "acc" | "neutro"> = { alta: "warn", media: "acc", fria: "neutro" };

export function TableroCrm({ prospectos, ctx, modelos, nombres, hoy }: { prospectos: Prospecto[]; ctx: ContextoVenta; modelos: { id: string; nombre: string }[]; nombres: Record<string, string>; hoy: string }) {
  const router = useRouter();
  const avisar = useAviso();
  const [editando, setEditando] = useState<Prospecto | "nuevo" | null>(null);
  const [venta, setVenta] = useState<Prefill | null>(null);
  const [q, setQ] = useState("");
  const [verCerrados, setVerCerrados] = useState(false);
  const [, iniciar] = useTransition();
  const nombreModelo = useMemo(() => new Map(modelos.map((m) => [m.id, m.nombre])), [modelos]);
  const filtrados = prospectos.filter((p) => !q.trim() || [p.nombre, p.telefono, p.siguiente_accion, p.notas].join(" ").toLowerCase().includes(q.trim().toLowerCase()));
  const etapas = ETAPAS.filter((e) => verCerrados || !ETAPAS_CERRADAS.includes(e.id) || e.id === "entregado");
  const vencidos = prospectos.filter((p) => p.fecha_siguiente && p.fecha_siguiente <= hoy && !ETAPAS_CERRADAS.includes(p.etapa)).length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-[1_1_240px] sm:max-w-[320px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar prospecto" aria-label="Buscar prospecto" className="campo pl-9" />
        </div>
        {vencidos ? <Pastilla tono="warn">{vencidos} seguimiento{vencidos === 1 ? "" : "s"} vencido{vencidos === 1 ? "" : "s"}</Pastilla> : null}
        <label className="inline-flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={verCerrados} onChange={(e) => setVerCerrados(e.target.checked)} className="size-4 accent-[var(--accent)]" />Ver referidores y perdidos</label>
        <span className="flex-1" />
        {ctx.yo.vende || ctx.direccion ? <Boton icono={Plus} onClick={() => setEditando("nuevo")}>Nuevo prospecto</Boton> : null}
      </div>

      {!prospectos.length ? (
        <Vacio titulo="Sin prospectos todavía" accion={<Boton icono={Plus} onClick={() => setEditando("nuevo")}>Nuevo prospecto</Boton>}>
          Da de alta a cada persona que te escribe o visita Park Point, con su siguiente acción y la fecha del próximo contacto.
        </Vacio>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <div className="grid auto-cols-[minmax(232px,1fr)] grid-flow-col gap-3">
            {etapas.map((e) => {
              const col = filtrados.filter((p) => p.etapa === e.id);
              return (
                <section key={e.id} aria-label={e.label} className="min-w-0 rounded-2xl bg-surface-2/70 p-2.5">
                  <h3 className="mb-2 flex items-center gap-1.5 px-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted">{e.label}<span className="rounded-full bg-surface px-1.5 text-[0.7rem]">{col.length}</span></h3>
                  <div className="grid gap-2">
                    {col.map((p) => {
                      const vencido = !!p.fecha_siguiente && p.fecha_siguiente <= hoy && !ETAPAS_CERRADAS.includes(p.etapa);
                      return (
                        <button key={p.id} type="button" onClick={() => setEditando(p)}
                          className={cx("grid gap-1.5 rounded-xl border border-line bg-surface p-3 text-left text-[0.84rem] shadow-card transition hover:border-accent", vencido && "shadow-[inset_3px_0_0_var(--warn)]")}>
                          <span className="flex items-start justify-between gap-2"><strong className="text-[0.9rem] leading-tight">{p.nombre}</strong><Pastilla tono={TONO_CALOR[p.calor]}>{CALORES.find((c) => c.id === p.calor)?.label}</Pastilla></span>
                          <span className="text-muted">{p.modelo_id ? nombreModelo.get(p.modelo_id) ?? "Modelo" : "Sin modelo"}{ctx.direccion ? ` · ${nombres[p.asesor_id] ?? ""}` : ""}</span>
                          {p.siguiente_accion ? <span>{p.siguiente_accion}</span> : null}
                          {p.fecha_siguiente ? <span className={cx("text-[0.76rem]", vencido ? "font-semibold text-warn" : "text-muted")}>{vencido ? "Vence " : "Próximo: "}{p.fecha_siguiente === hoy ? "hoy" : fechaCorta(p.fecha_siguiente)}</span> : null}
                          <select aria-label="Mover a etapa" value={p.etapa} onClick={(ev) => ev.stopPropagation()}
                            onChange={(ev) => { const etapa = ev.target.value; iniciar(async () => { const r = await moverEtapa(p.id, etapa); if (!r.ok) avisar(r.error, "error"); else router.refresh(); }); }}
                            className="campo mt-1 h-8 min-h-0 py-0 text-[0.78rem]">
                            {ETAPAS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                          </select>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      <FormularioProspecto abierto={editando !== null} prospecto={editando === "nuevo" ? null : editando} ctx={ctx} modelos={modelos} alCerrar={() => setEditando(null)}
        alConvertir={(p) => { setEditando(null); setVenta({ cliente: p.nombre, telefono: p.telefono, modelo_id: p.modelo_id ?? undefined, vendedor_id: p.asesor_id, prospecto_id: p.id, origen: p.origen }); }} />
      <FormularioVenta abierto={venta !== null} alCerrar={() => setVenta(null)} ctx={ctx} prefill={venta ?? undefined} alGuardar={(vid) => router.push(`/ventas/${vid}`)} />
    </>
  );
}

function FormularioProspecto({ abierto, prospecto, ctx, modelos, alCerrar, alConvertir }: {
  abierto: boolean; prospecto: Prospecto | null; ctx: ContextoVenta; modelos: { id: string; nombre: string }[]; alCerrar: () => void; alConvertir: (p: Prospecto) => void;
}) {
  return (
    <Dialogo abierto={abierto} alCerrar={alCerrar} titulo={prospecto ? prospecto.nombre : "Nuevo prospecto"} subtitulo={prospecto ? "Actualiza la etapa y agenda el siguiente contacto." : "Nombre, modelo de interés y siguiente acción."}>
      {abierto ? <CuerpoProspecto key={prospecto?.id ?? "nuevo"} prospecto={prospecto} ctx={ctx} modelos={modelos} alCerrar={alCerrar} alConvertir={alConvertir} /> : null}
    </Dialogo>
  );
}

function CuerpoProspecto({ prospecto, ctx, modelos, alCerrar, alConvertir }: { prospecto: Prospecto | null; ctx: ContextoVenta; modelos: { id: string; nombre: string }[]; alCerrar: () => void; alConvertir: (p: Prospecto) => void }) {
  const router = useRouter();
  const avisar = useAviso();
  const [ocupado, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [borrar, setBorrar] = useState(false);
  const [f, setF] = useState({
    asesor_id: prospecto?.asesor_id ?? (ctx.yo.vende ? ctx.yo.id : ""), nombre: prospecto?.nombre ?? "", telefono: prospecto?.telefono ?? "",
    modelo_id: prospecto?.modelo_id ?? "", etapa: prospecto?.etapa ?? "nuevo", origen: prospecto?.origen ?? "Park Point", calor: prospecto?.calor ?? "media",
    siguiente_accion: prospecto?.siguiente_accion ?? "", fecha_siguiente: prospecto?.fecha_siguiente ?? "", enganche: prospecto?.enganche != null ? String(prospecto.enganche) : "",
    toma_a_cuenta: prospecto?.toma_a_cuenta ?? "", notas: prospecto?.notas ?? "",
  });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const entrada = (): EntradaProspecto => ({ ...f, id: prospecto?.id, enganche: f.enganche ? Number(f.enganche) : null });

  function guardar(despues?: (id: string) => void) {
    if (!f.nombre.trim()) { setError("Escribe el nombre del prospecto."); return; }
    if (!f.asesor_id) { setError("Elige el asesor."); return; }
    setError(null);
    iniciar(async () => {
      const r = await guardarProspecto(entrada());
      if (!r.ok) { setError(r.error); return; }
      avisar(r.mensaje ?? "Guardado");
      router.refresh();
      if (despues && r.id) despues(r.id); else alCerrar();
    });
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); guardar(); }} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre" htmlFor="p-nombre" requerido><input id="p-nombre" className="campo" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} autoComplete="off" /></Campo>
        <Campo etiqueta="WhatsApp" htmlFor="p-tel"><input id="p-tel" type="tel" className="campo" value={f.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="10 dígitos" /></Campo>
        <Campo etiqueta="Asesor" htmlFor="p-asesor" requerido>
          <select id="p-asesor" className="campo" value={f.asesor_id} disabled={!ctx.direccion} onChange={(e) => set("asesor_id", e.target.value)}>
            {ctx.direccion ? <option value="">Elige asesor</option> : null}
            {(ctx.direccion ? ctx.vendedores : ctx.vendedores.filter((v) => v.id === ctx.yo.id)).map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Modelo de interés" htmlFor="p-modelo">
          <select id="p-modelo" className="campo" value={f.modelo_id} onChange={(e) => set("modelo_id", e.target.value)}><option value="">Sin definir</option>{modelos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select>
        </Campo>
        <Campo etiqueta="Etapa" htmlFor="p-etapa"><select id="p-etapa" className="campo" value={f.etapa} onChange={(e) => set("etapa", e.target.value)}>{ETAPAS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Campo>
        <Campo etiqueta="Origen" htmlFor="p-origen"><select id="p-origen" className="campo" value={f.origen} onChange={(e) => set("origen", e.target.value)}>{ORIGENES.map((x) => <option key={x}>{x}</option>)}</select></Campo>
        <Campo etiqueta="Calor" htmlFor="p-calor"><select id="p-calor" className="campo" value={f.calor} onChange={(e) => set("calor", e.target.value)}>{CALORES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Campo>
        <Campo etiqueta="Enganche posible" htmlFor="p-eng" ayuda={f.enganche ? dinero(Number(f.enganche)) : undefined}><input id="p-eng" type="number" min={0} step={1000} className="campo" value={f.enganche} onChange={(e) => set("enganche", e.target.value)} /></Campo>
        <Campo etiqueta="Siguiente acción" htmlFor="p-sig" className="sm:col-span-2"><input id="p-sig" className="campo" value={f.siguiente_accion} onChange={(e) => set("siguiente_accion", e.target.value)} placeholder="Ej. Mandar escenario a 72 meses con 50% de enganche" /></Campo>
        <Campo etiqueta="Fecha del siguiente contacto" htmlFor="p-fecha"><input id="p-fecha" type="date" className="campo" value={f.fecha_siguiente} onChange={(e) => set("fecha_siguiente", e.target.value)} /></Campo>
        <Campo etiqueta="Toma a cuenta" htmlFor="p-toma"><input id="p-toma" className="campo" value={f.toma_a_cuenta} onChange={(e) => set("toma_a_cuenta", e.target.value)} placeholder="Auto a cuenta, si trae" /></Campo>
        <Campo etiqueta="Notas" htmlFor="p-notas" className="sm:col-span-2"><textarea id="p-notas" className="campo min-h-[72px]" value={f.notas} onChange={(e) => set("notas", e.target.value)} /></Campo>
      </div>
      {error ? <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-sm font-semibold text-bad">{error}</p> : null}
      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <Boton type="submit" disabled={ocupado}>{ocupado ? "Guardando…" : "Guardar"}</Boton>
        {f.telefono.replace(/\D/g, "").length >= 10 ? <BotonEnlace variante="whatsapp" externo href={enlaceWhatsApp(f.telefono, `Hola ${f.nombre.split(" ")[0]}, soy ${ctx.yo.nombre.split(" ")[0]} de BYD Park Point. `)}>WhatsApp</BotonEnlace> : null}
        {prospecto && !prospecto.venta_id ? <Boton variante="secundario" icono={CarFront} disabled={ocupado} onClick={() => guardar(() => alConvertir({ ...prospecto, ...entrada(), enganche: f.enganche ? Number(f.enganche) : null } as Prospecto))}>Convertir en venta</Boton> : null}
        {prospecto?.venta_id ? <BotonEnlace variante="secundario" href={`/ventas/${prospecto.venta_id}`}>Ver venta</BotonEnlace> : null}
        <span className="flex-1" />
        {prospecto ? <Boton variante="peligro" icono={Trash2} onClick={() => setBorrar(true)}>Borrar</Boton> : null}
      </div>
      {prospecto ? (
        <Confirmar abierto={borrar} alCerrar={() => setBorrar(false)} titulo="¿Borrar prospecto?" texto={`Se borra a ${prospecto.nombre} del CRM.`} boton="Borrar"
          alConfirmar={() => iniciar(async () => { const r = await borrarProspecto(prospecto.id); if (!r.ok) { avisar(r.error, "error"); return; } avisar("Prospecto borrado"); setBorrar(false); alCerrar(); router.refresh(); })} />
      ) : null}
    </form>
  );
}
