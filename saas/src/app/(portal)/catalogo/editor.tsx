"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save } from "lucide-react";
import { Boton, Campo, Pastilla, Tabla, Tarjeta, TituloTarjeta } from "@/components/ui";
import { Dialogo, useAviso } from "@/components/cliente";
import { dinero } from "@/lib/dominio/formato";
import type { Modelo, ParametrosAgencia, Producto } from "@/lib/tipos";
import { guardarModelo, guardarParametros, guardarProducto } from "./acciones";

export function EditorCatalogo({ modelos, productos, parametros }: { modelos: Modelo[]; productos: Producto[]; parametros: ParametrosAgencia }) {
  const [modelo, setModelo] = useState<Modelo | "nuevo" | null>(null);
  const [producto, setProducto] = useState<Producto | "nuevo" | null>(null);
  return (
    <>
      <Tarjeta className="p-2 sm:p-3">
        <div className="px-3 pt-2"><TituloTarjeta titulo="Modelos, precios y bonos" nota="El bono solo aplica financiando desde 5% de enganche"><Boton tamano="sm" icono={Plus} onClick={() => setModelo("nuevo")}>Agregar modelo</Boton></TituloTarjeta></div>
        <Tabla>
          <thead><tr><th>Modelo</th><th>Motor</th><th className="!text-right">Precio</th><th className="!text-right">Bono</th><th>Estado</th><th /></tr></thead>
          <tbody>
            {modelos.map((m) => (
              <tr key={m.id} className={m.activo ? "" : "opacity-55"}>
                <td><strong>{m.nombre}</strong> <span className="text-muted">{m.anio}</span></td>
                <td>{m.motor === "electrico" ? "Eléctrico" : "Híbrido"}</td>
                <td className="text-right">{dinero(m.precio)}</td>
                <td className="text-right">{m.bono ? dinero(m.bono) : "—"}</td>
                <td><Pastilla tono={m.activo ? "ok" : "neutro"}>{m.activo ? "A la venta" : "Oculto"}</Pastilla></td>
                <td className="text-right"><Boton variante="secundario" tamano="sm" onClick={() => setModelo(m)}>Editar</Boton></td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Tarjeta>
      <div className="grid gap-5 lg:grid-cols-2">
        <Tarjeta className="p-2 sm:p-3">
          <div className="px-3 pt-2"><TituloTarjeta titulo="Productos (KPIs)"><Boton tamano="sm" icono={Plus} onClick={() => setProducto("nuevo")}>Agregar</Boton></TituloTarjeta></div>
          <Tabla>
            <thead><tr><th>Producto</th><th className="!text-right">Precio</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.id} className={p.activo ? "" : "opacity-55"}>
                  <td>{p.nombre}<span className="block text-[0.74rem] text-muted">Corto: {p.nombre_corto}</span></td>
                  <td className="text-right">{p.precio != null ? dinero(p.precio) : "—"}</td>
                  <td><Pastilla tono={p.activo ? "ok" : "neutro"}>{p.activo ? "Se mide" : "Oculto"}</Pastilla></td>
                  <td className="text-right"><Boton variante="secundario" tamano="sm" onClick={() => setProducto(p)}>Editar</Boton></td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        </Tarjeta>
        <EditorParametros parametros={parametros} />
      </div>
      <DialogoModelo modelo={modelo} alCerrar={() => setModelo(null)} siguienteOrden={modelos.length + 1} />
      <DialogoProducto producto={producto} alCerrar={() => setProducto(null)} siguienteOrden={productos.length + 1} />
    </>
  );
}

function useGuardar() {
  const router = useRouter();
  const avisar = useAviso();
  const [ocupado, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const correr = (fn: () => Promise<{ ok: true; mensaje?: string } | { ok: false; error: string }>, alTerminar?: () => void) =>
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) { setError(r.error); return; }
      setError(null); avisar(r.mensaje ?? "Guardado"); router.refresh(); alTerminar?.();
    });
  return { ocupado, error, correr };
}

function DialogoModelo({ modelo, alCerrar, siguienteOrden }: { modelo: Modelo | "nuevo" | null; alCerrar: () => void; siguienteOrden: number }) {
  const m = modelo && modelo !== "nuevo" ? modelo : null;
  return (
    <Dialogo abierto={modelo !== null} alCerrar={alCerrar} titulo={m ? `${m.nombre} ${m.anio}` : "Agregar modelo"} ancho="sm">
      {modelo !== null ? <FormModelo key={m?.id ?? "nuevo"} m={m} alCerrar={alCerrar} siguienteOrden={siguienteOrden} /> : null}
    </Dialogo>
  );
}
function FormModelo({ m, alCerrar, siguienteOrden }: { m: Modelo | null; alCerrar: () => void; siguienteOrden: number }) {
  const { ocupado, error, correr } = useGuardar();
  const [f, setF] = useState({ nombre: m?.nombre ?? "", anio: String(m?.anio ?? new Date().getFullYear() + 1), motor: m?.motor ?? "hibrido", precio: String(m?.precio ?? ""), bono: String(m?.bono ?? 0), descripcion: m?.descripcion ?? "", activo: m?.activo ?? true });
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); correr(() => guardarModelo({ id: m?.id, nombre: f.nombre, anio: Number(f.anio), motor: f.motor as "electrico" | "hibrido", precio: Number(f.precio) || 0, bono: Number(f.bono) || 0, descripcion: f.descripcion, activo: f.activo, orden: m?.orden ?? siguienteOrden }), alCerrar); }}>
      <Campo etiqueta="Nombre" htmlFor="m-nombre" requerido><input id="m-nombre" className="campo" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Campo>
      <div className="grid grid-cols-2 gap-4">
        <Campo etiqueta="Año modelo" htmlFor="m-anio"><input id="m-anio" type="number" className="campo" value={f.anio} onChange={(e) => setF({ ...f, anio: e.target.value })} /></Campo>
        <Campo etiqueta="Motor" htmlFor="m-motor"><select id="m-motor" className="campo" value={f.motor} onChange={(e) => setF({ ...f, motor: e.target.value as "electrico" | "hibrido" })}><option value="hibrido">Híbrido</option><option value="electrico">Eléctrico</option></select></Campo>
        <Campo etiqueta="Precio de lista" htmlFor="m-precio" requerido><input id="m-precio" type="number" min={0} className="campo" value={f.precio} onChange={(e) => setF({ ...f, precio: e.target.value })} /></Campo>
        <Campo etiqueta="Bono flexible" htmlFor="m-bono"><input id="m-bono" type="number" min={0} className="campo" value={f.bono} onChange={(e) => setF({ ...f, bono: e.target.value })} /></Campo>
      </div>
      <Campo etiqueta="Argumento de venta" htmlFor="m-desc"><textarea id="m-desc" className="campo min-h-[64px]" value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></Campo>
      <label className="inline-flex items-center gap-2.5 text-[0.9rem]"><input type="checkbox" className="size-4 accent-[var(--accent)]" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} />A la venta (aparece en el cotizador y en ventas nuevas)</label>
      {error ? <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-sm font-semibold text-bad">{error}</p> : null}
      <div className="flex gap-2"><Boton type="submit" icono={Save} disabled={ocupado}>{ocupado ? "Guardando…" : "Guardar"}</Boton><Boton variante="secundario" onClick={alCerrar}>Cancelar</Boton></div>
    </form>
  );
}

function DialogoProducto({ producto, alCerrar, siguienteOrden }: { producto: Producto | "nuevo" | null; alCerrar: () => void; siguienteOrden: number }) {
  const p = producto && producto !== "nuevo" ? producto : null;
  return (
    <Dialogo abierto={producto !== null} alCerrar={alCerrar} titulo={p ? p.nombre : "Agregar producto"} ancho="sm">
      {producto !== null ? <FormProducto key={p?.id ?? "nuevo"} p={p} alCerrar={alCerrar} siguienteOrden={siguienteOrden} /> : null}
    </Dialogo>
  );
}
function FormProducto({ p, alCerrar, siguienteOrden }: { p: Producto | null; alCerrar: () => void; siguienteOrden: number }) {
  const { ocupado, error, correr } = useGuardar();
  const [f, setF] = useState({ nombre: p?.nombre ?? "", nombre_corto: p?.nombre_corto ?? "", precio: p?.precio != null ? String(p.precio) : "", activo: p?.activo ?? true });
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); correr(() => guardarProducto({ id: p?.id, nombre: f.nombre, nombre_corto: f.nombre_corto || f.nombre.slice(0, 20), precio: f.precio ? Number(f.precio) : null, activo: f.activo, orden: p?.orden ?? siguienteOrden }), alCerrar); }}>
      <Campo etiqueta="Nombre" htmlFor="pr-nombre" requerido><input id="pr-nombre" className="campo" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Campo>
      <div className="grid grid-cols-2 gap-4">
        <Campo etiqueta="Nombre corto" htmlFor="pr-corto" ayuda="Para tablas y la imagen."><input id="pr-corto" className="campo" maxLength={20} value={f.nombre_corto} onChange={(e) => setF({ ...f, nombre_corto: e.target.value })} /></Campo>
        <Campo etiqueta="Precio" htmlFor="pr-precio" ayuda="Vacío si varía."><input id="pr-precio" type="number" min={0} className="campo" value={f.precio} onChange={(e) => setF({ ...f, precio: e.target.value })} /></Campo>
      </div>
      <label className="inline-flex items-center gap-2.5 text-[0.9rem]"><input type="checkbox" className="size-4 accent-[var(--accent)]" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} />Se mide en las ventas</label>
      {error ? <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-sm font-semibold text-bad">{error}</p> : null}
      <div className="flex gap-2"><Boton type="submit" icono={Save} disabled={ocupado}>{ocupado ? "Guardando…" : "Guardar"}</Boton><Boton variante="secundario" onClick={alCerrar}>Cancelar</Boton></div>
    </form>
  );
}

const CAMPOS_PARAM: [keyof ParametrosAgencia, string, string?][] = [
  ["placas_hibrido", "Placas híbrido (MTY)"], ["placas_electrico", "Placas eléctrico (MTY)"], ["gestoria", "Gestoría de placas"],
  ["permiso_frontera", "Permiso frontera (PN)"], ["separacion", "Separación"], ["garantia_extendida", "Garantía extendida"],
  ["meta_unidades", "Meta inicial de unidades", "Por vendedor, si el mes no tiene metas guardadas."], ["meta_producto", "Meta inicial por producto (%)"],
];
function EditorParametros({ parametros }: { parametros: ParametrosAgencia }) {
  const { ocupado, error, correr } = useGuardar();
  const [f, setF] = useState(() => Object.fromEntries(CAMPOS_PARAM.map(([k]) => [k, String(parametros[k] ?? "")])) as Record<string, string>);
  return (
    <Tarjeta>
      <TituloTarjeta titulo="Trámites y parámetros" nota="Los usa el cotizador" />
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); correr(() => guardarParametros(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, Number(v) || 0])) as never)); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          {CAMPOS_PARAM.map(([k, t, ayuda]) => <Campo key={k} etiqueta={t} htmlFor={`pa-${k}`} ayuda={ayuda}><input id={`pa-${k}`} type="number" min={0} className="campo" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Campo>)}
        </div>
        {error ? <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-sm font-semibold text-bad">{error}</p> : null}
        <div><Boton type="submit" icono={Save} disabled={ocupado}>{ocupado ? "Guardando…" : "Guardar parámetros"}</Boton></div>
      </form>
    </Tarjeta>
  );
}
