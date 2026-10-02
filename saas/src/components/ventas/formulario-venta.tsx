"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Boton, Campo, cx } from "@/components/ui";
import { Dialogo, useAviso } from "@/components/cliente";
import { COLORES, ESTATUS, FORMAS_PAGO, PLAZAS } from "@/lib/dominio/catalogos";
import { revisarVin, normalizarVin } from "@/lib/dominio/vin";
import { hoy } from "@/lib/dominio/fechas";
import { guardarVenta, type EntradaVenta } from "@/app/(portal)/ventas/acciones";
import type { Modelo, Perfil, Producto, Venta } from "@/lib/tipos";

export type ContextoVenta = {
  yo: Pick<Perfil, "id" | "nombre" | "vende">;
  direccion: boolean;
  vendedores: Pick<Perfil, "id" | "nombre" | "rol">[];
  modelos: Pick<Modelo, "id" | "nombre" | "anio" | "activo">[];
  productos: Pick<Producto, "id" | "nombre">[];
  vinesUsados: { vin: string; cliente: string; id: string }[];
};

export type Prefill = Partial<Pick<Venta, "cliente" | "telefono" | "modelo_id" | "vendedor_id">> & { prospecto_id?: string };

export function FormularioVenta({ abierto, alCerrar, ctx, venta, prefill, alGuardar }: {
  abierto: boolean; alCerrar: () => void; ctx: ContextoVenta; venta?: Venta | null; prefill?: Prefill; alGuardar?: (id: string) => void;
}) {
  return (
    <Dialogo abierto={abierto} alCerrar={alCerrar} titulo={venta ? "Editar venta" : "Registrar venta"} subtitulo={venta ? `Folio ${venta.folio}` : "VIN, número de cliente, modelo, color y productos"} ancho="lg">
      {abierto ? <Cuerpo key={venta?.id ?? "nueva"} alCerrar={alCerrar} ctx={ctx} venta={venta} prefill={prefill} alGuardar={alGuardar} /> : null}
    </Dialogo>
  );
}

function Cuerpo({ alCerrar, ctx, venta, prefill, alGuardar }: { alCerrar: () => void; ctx: ContextoVenta; venta?: Venta | null; prefill?: Prefill; alGuardar?: (id: string) => void }) {
  const router = useRouter();
  const avisar = useAviso();
  const [ocupado, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});
  const [f, setF] = useState(() => ({
    fecha: venta?.fecha ?? hoy(),
    vendedor_id: venta?.vendedor_id ?? prefill?.vendedor_id ?? (ctx.yo.vende ? ctx.yo.id : ""),
    cliente: venta?.cliente ?? prefill?.cliente ?? "",
    num_cliente: venta?.num_cliente ?? "",
    telefono: venta?.telefono ?? prefill?.telefono ?? "",
    vin: venta?.vin ?? "",
    modelo_id: venta?.modelo_id ?? prefill?.modelo_id ?? "",
    color: venta?.color ?? "",
    color_nombre: venta?.color_nombre ?? "",
    forma_pago: venta?.forma_pago ?? "Crédito Banorte",
    plaza: venta?.plaza ?? "Monterrey",
    estatus: venta?.estatus ?? "facturada",
    fecha_entrega: venta?.fecha_entrega ?? "",
    valor_factura: venta?.valor_factura != null ? String(venta.valor_factura) : "",
    notas: venta?.notas ?? "",
    productos: new Set(venta?.productos ?? []),
  }));
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const estadoVin = revisarVin(f.vin);
  const vinDuplicado = useMemo(() => {
    const v = normalizarVin(f.vin);
    return v.length === 17 ? ctx.vinesUsados.find((x) => x.vin === v && x.id !== venta?.id) : undefined;
  }, [f.vin, ctx.vinesUsados, venta?.id]);

  const faltas: Record<string, string> = {};
  if (!f.cliente.trim()) faltas.cliente = "Escribe el nombre del cliente.";
  if (!f.vendedor_id) faltas.vendedor_id = "Elige quién vendió la unidad.";
  if (!f.modelo_id) faltas.modelo_id = "Elige el modelo.";
  if (!f.color) faltas.color = "Elige el color de la unidad.";
  if (!estadoVin.valido) faltas.vin = estadoVin.mensaje;
  if (vinDuplicado) faltas.vin = `Ese VIN ya está en la venta de ${vinDuplicado.cliente}.`;
  const ver = (k: string) => (marcados[k] || marcados._todo ? faltas[k] : null);

  function enviar() {
    setMarcados({ _todo: true });
    if (Object.keys(faltas).length) { setError("Completa los campos marcados."); return; }
    setError(null);
    const entrada: EntradaVenta = {
      id: venta?.id, fecha: f.fecha, vendedor_id: f.vendedor_id, cliente: f.cliente, num_cliente: f.num_cliente, telefono: f.telefono,
      vin: f.vin, modelo_id: f.modelo_id, color: f.color, color_nombre: f.color_nombre, forma_pago: f.forma_pago as EntradaVenta["forma_pago"],
      plaza: f.plaza as EntradaVenta["plaza"], estatus: f.estatus as EntradaVenta["estatus"], fecha_entrega: f.fecha_entrega,
      valor_factura: f.valor_factura ? Number(f.valor_factura) : null, notas: f.notas, productos: [...f.productos], prospecto_id: prefill?.prospecto_id ?? null,
    };
    iniciar(async () => {
      const r = await guardarVenta(entrada);
      if (!r.ok) { setError(r.error); return; }
      avisar(r.mensaje ?? "Guardado");
      alCerrar();
      if (alGuardar && r.id) alGuardar(r.id); else router.refresh();
    });
  }

  const modelosVisibles = ctx.modelos.filter((m) => m.activo || m.id === f.modelo_id);
  return (
    <form onSubmit={(e) => { e.preventDefault(); enviar(); }} noValidate className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Fecha de venta" htmlFor="v-fecha" requerido>
          <input id="v-fecha" type="date" className="campo" value={f.fecha} onChange={(e) => set("fecha", e.target.value)} />
        </Campo>
        <Campo etiqueta="Vendedor" htmlFor="v-vendedor" requerido error={ver("vendedor_id")} ayuda={ctx.direccion ? "Jorge también aparece como vendedor." : undefined}>
          <select id="v-vendedor" className="campo" value={f.vendedor_id} disabled={!ctx.direccion} aria-invalid={!!ver("vendedor_id")}
            onChange={(e) => set("vendedor_id", e.target.value)} onBlur={() => setMarcados((m) => ({ ...m, vendedor_id: true }))}>
            {ctx.direccion ? <option value="">Elige vendedor</option> : null}
            {(ctx.direccion ? ctx.vendedores : ctx.vendedores.filter((v) => v.id === ctx.yo.id)).map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Cliente" htmlFor="v-cliente" requerido error={ver("cliente")}>
          <input id="v-cliente" className="campo" value={f.cliente} autoComplete="off" placeholder="Nombre y apellidos" aria-invalid={!!ver("cliente")}
            onChange={(e) => set("cliente", e.target.value)} onBlur={() => setMarcados((m) => ({ ...m, cliente: true }))} />
        </Campo>
        <Campo etiqueta="Número de cliente" htmlFor="v-num" ayuda="Quiter → Fichas maestras → Cuentas personales.">
          <input id="v-num" className="campo" value={f.num_cliente} autoComplete="off" inputMode="numeric" onChange={(e) => set("num_cliente", e.target.value)} />
        </Campo>
        <Campo etiqueta="VIN" htmlFor="v-vin" error={ver("vin") ?? (estadoVin.tono === "error" ? estadoVin.mensaje : null)} ayuda={vinDuplicado ? undefined : estadoVin.mensaje}>
          <input id="v-vin" className="campo font-mono uppercase tracking-[0.08em]" maxLength={17} value={f.vin} autoComplete="off" spellCheck={false} placeholder="17 caracteres" aria-invalid={!!ver("vin")}
            onChange={(e) => set("vin", normalizarVin(e.target.value))} onBlur={() => setMarcados((m) => ({ ...m, vin: true }))} />
        </Campo>
        <Campo etiqueta="Modelo" htmlFor="v-modelo" requerido error={ver("modelo_id")}>
          <select id="v-modelo" className="campo" value={f.modelo_id} aria-invalid={!!ver("modelo_id")}
            onChange={(e) => set("modelo_id", e.target.value)} onBlur={() => setMarcados((m) => ({ ...m, modelo_id: true }))}>
            <option value="">Elige modelo</option>
            {modelosVisibles.map((m) => <option key={m.id} value={m.id}>{m.nombre} {m.anio}</option>)}
          </select>
        </Campo>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-[0.8rem] font-semibold text-muted">Color de la unidad <span className="text-bad">*</span></legend>
        <div className="flex flex-wrap gap-1.5" role="radiogroup">
          {COLORES.map((c) => (
            <label key={c.id} className={cx("relative inline-flex cursor-pointer items-center gap-1.5 rounded-full border py-1.5 pl-2 pr-3 text-[0.84rem] transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
              f.color === c.id ? "border-fg font-semibold shadow-[inset_0_0_0_1px_var(--fg)]" : "border-line hover:border-subtle")}>
              <input type="radio" name="color" value={c.id} checked={f.color === c.id} onChange={() => set("color", c.id)} className="absolute opacity-0" />
              <span className="size-3.5 rounded-full border border-line" style={{ background: c.hex }} />
              {c.id}
            </label>
          ))}
        </div>
        {ver("color") ? <span className="text-[0.78rem] font-semibold text-bad">{ver("color")}</span> : null}
        <input aria-label="Nombre comercial del color" className="campo mt-1 sm:max-w-[360px]" value={f.color_nombre} placeholder="Nombre comercial (opcional): Time Grey, Snow White…" onChange={(e) => set("color_nombre", e.target.value)} />
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-[0.8rem] font-semibold text-muted">Productos vendidos (KPIs)</legend>
        <div className="flex flex-wrap gap-2">
          {ctx.productos.map((p) => {
            const activo = f.productos.has(p.id);
            return (
              <label key={p.id} className={cx("relative inline-flex cursor-pointer select-none items-center gap-2 rounded-full border px-3 py-2 text-[0.86rem] font-medium transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                activo ? "border-accent bg-accent text-on-accent" : "border-line bg-surface hover:border-subtle")}>
                <input type="checkbox" className="absolute opacity-0" checked={activo} onChange={() => {
                  const n = new Set(f.productos); if (activo) n.delete(p.id); else n.add(p.id); set("productos", n);
                }} />
                <span className={cx("grid size-4 place-items-center rounded border-[1.5px]", activo ? "border-on-accent" : "border-subtle")}>{activo ? <Check className="size-3" strokeWidth={3} /> : null}</span>
                {p.nombre}
              </label>
            );
          })}
        </div>
        <span className="text-[0.78rem] text-muted">Marca todo lo que se llevó el cliente: cuenta para la penetración por producto.</span>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo etiqueta="Forma de pago" htmlFor="v-pago">
          <select id="v-pago" className="campo" value={f.forma_pago} onChange={(e) => set("forma_pago", e.target.value)}>{FORMAS_PAGO.map((x) => <option key={x}>{x}</option>)}</select>
        </Campo>
        <Campo etiqueta="Plaza" htmlFor="v-plaza">
          <select id="v-plaza" className="campo" value={f.plaza} onChange={(e) => set("plaza", e.target.value)}>{PLAZAS.map((x) => <option key={x}>{x}</option>)}</select>
        </Campo>
        <Campo etiqueta="Estatus" htmlFor="v-estatus" ayuda="Las canceladas no cuentan.">
          <select id="v-estatus" className="campo" value={f.estatus} onChange={(e) => set("estatus", e.target.value as typeof f.estatus)}>{ESTATUS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
        </Campo>
        <Campo etiqueta="Fecha de entrega" htmlFor="v-entrega">
          <input id="v-entrega" type="date" className="campo" value={f.fecha_entrega} onChange={(e) => set("fecha_entrega", e.target.value)} />
        </Campo>
        <Campo etiqueta="Valor factura" htmlFor="v-valor" ayuda="Opcional, en pesos.">
          <input id="v-valor" type="number" min={0} step={100} inputMode="decimal" className="campo" value={f.valor_factura} onChange={(e) => set("valor_factura", e.target.value)} />
        </Campo>
        <Campo etiqueta="Teléfono del cliente" htmlFor="v-tel">
          <input id="v-tel" type="tel" className="campo" value={f.telefono} placeholder="10 dígitos" onChange={(e) => set("telefono", e.target.value)} />
        </Campo>
      </div>
      <Campo etiqueta="Notas" htmlFor="v-notas">
        <textarea id="v-notas" className="campo min-h-[76px] resize-y" value={f.notas} placeholder="Aseguradora, accesorios específicos, detalle de placas…" onChange={(e) => set("notas", e.target.value)} />
      </Campo>
      {error ? <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-sm font-semibold text-bad">{error}</p> : null}
      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <Boton type="submit" disabled={ocupado}>{ocupado ? "Guardando…" : venta ? "Guardar cambios" : "Registrar venta"}</Boton>
        <Boton variante="secundario" onClick={alCerrar}>Cancelar</Boton>
      </div>
    </form>
  );
}
