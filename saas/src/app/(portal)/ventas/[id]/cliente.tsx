"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Trash2 } from "lucide-react";
import { Boton, BotonEnlace, Campo, cx } from "@/components/ui";
import { Confirmar, useAviso } from "@/components/cliente";
import { FormularioVenta, type ContextoVenta } from "@/components/ventas/formulario-venta";
import { pasosAplicables } from "@/lib/dominio/catalogos";
import { fechaCorta } from "@/lib/dominio/fechas";
import { dinero2, enlaceWhatsApp } from "@/lib/dominio/formato";
import { calcularCuadre, type DatosCuadre } from "@/lib/dominio/cuadre";
import { borrarVenta, guardarCuadre, marcarPaso } from "../acciones";
import type { Venta } from "@/lib/tipos";

export function AccionesVenta({ venta, ctx, puedeBorrar }: { venta: Venta; ctx: ContextoVenta; puedeBorrar: boolean }) {
  const router = useRouter();
  const avisar = useAviso();
  const [editar, setEditar] = useState(false);
  const [borrar, setBorrar] = useState(false);
  const [ocupado, iniciar] = useTransition();
  return (
    <>
      {venta.telefono ? <BotonEnlace variante="whatsapp" externo href={enlaceWhatsApp(venta.telefono, `Hola ${venta.cliente.split(" ")[0]}, `)}>WhatsApp</BotonEnlace> : null}
      <Boton variante="secundario" icono={Pencil} onClick={() => setEditar(true)}>Editar</Boton>
      {puedeBorrar ? <Boton variante="peligro" icono={Trash2} onClick={() => setBorrar(true)}>Borrar</Boton> : null}
      <FormularioVenta abierto={editar} alCerrar={() => setEditar(false)} ctx={ctx} venta={venta} />
      <Confirmar abierto={borrar} alCerrar={() => setBorrar(false)} titulo="¿Borrar esta venta?" boton="Borrar venta" ocupado={ocupado}
        texto={`Se borra la venta de ${venta.cliente} para todo el equipo. Si solo se cayó, mejor márcala como Cancelada.`}
        alConfirmar={() => iniciar(async () => {
          const r = await borrarVenta(venta.id);
          if (!r.ok) { avisar(r.error, "error"); return; }
          avisar("Venta borrada");
          router.replace("/ventas");
        })} />
    </>
  );
}

export function Expediente({ ventaId, formaPago, expediente }: { ventaId: string; formaPago: string; expediente: Record<string, string> }) {
  const router = useRouter();
  const avisar = useAviso();
  const [pendiente, setPendiente] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  const pasos = pasosAplicables(formaPago);
  const siguiente = pasos.find((p) => !expediente[p.id])?.id;
  return (
    <ol className="grid gap-1">
      {pasos.map((p, i) => {
        const hecho = !!expediente[p.id];
        return (
          <li key={p.id}>
            <button type="button" disabled={pendiente === p.id}
              onClick={() => { setPendiente(p.id); iniciar(async () => {
                const r = await marcarPaso(ventaId, p.id, !hecho);
                setPendiente(null);
                if (!r.ok) avisar(r.error, "error"); else router.refresh();
              }); }}
              className={cx("flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-surface-2", p.id === siguiente && "bg-accent-soft hover:bg-accent-soft")}>
              <span className={cx("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 text-[0.72rem] font-bold",
                hecho ? "border-ok bg-ok text-surface" : p.id === siguiente ? "border-accent text-accent" : "border-line text-muted")}>
                {hecho ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cx("block text-[0.9rem] font-semibold", hecho && "text-muted")}>{p.label}</span>
                <span className="block text-[0.78rem] text-muted">{hecho ? `Hecho el ${fechaCorta(expediente[p.id])}` : p.ayuda}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function Cuadre({ venta, separacionDefault }: { venta: Venta; separacionDefault: number }) {
  const router = useRouter();
  const avisar = useAviso();
  const [ocupado, iniciar] = useTransition();
  const ini = (v: number | null | undefined) => (v == null ? "" : String(v));
  const [f, setF] = useState({
    valor_factura: ini(venta.valor_factura), enganche: ini(venta.cuadre.enganche), separacion: ini(venta.cuadre.separacion ?? separacionDefault),
    bonos: ini(venta.cuadre.bonos), desembolso_real: ini(venta.cuadre.desembolso_real), pagos_adicionales: ini(venta.cuadre.pagos_adicionales), extras: ini(venta.cuadre.extras),
  });
  const num = (v: string) => (v.trim() === "" ? null : Number(v));
  const datos = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, num(v)])) as DatosCuadre;
  const c = calcularCuadre(datos, venta.forma_pago, separacionDefault);
  const contado = venta.forma_pago === "Contado";
  const campo = (k: keyof typeof f, etiqueta: string, ayuda?: string) => (
    <Campo etiqueta={etiqueta} htmlFor={`cu-${k}`} ayuda={ayuda}>
      <input id={`cu-${k}`} type="number" min={0} step={100} inputMode="decimal" className="campo" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </Campo>
  );
  const fila = (k: string, v: string, fuerte?: boolean) => <div className="flex justify-between gap-3 text-[0.9rem]"><span className="text-muted">{k}</span><span className={cx("tabular-nums", fuerte && "font-semibold")}>{v}</span></div>;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="grid gap-4 sm:grid-cols-2">
        {campo("valor_factura", "Valor factura")}
        {campo("enganche", contado ? "Pagos del cliente" : "Enganche total", contado ? "Todo lo que ha pagado." : "Incluye la separación.")}
        {campo("separacion", "Separación")}
        {campo("bonos", "Bonos de agencia y frontera")}
        {contado ? null : campo("desembolso_real", "Desembolso real del banco", `Esperado: ${dinero2(c.desembolsoEsperado)}`)}
        {campo("extras", "Extras vendidos", "Garantía, accesorios, seguros…")}
        {campo("pagos_adicionales", "Pagos adicionales", "Lo que liquidó en caja para cuadrar.")}
      </div>
      <div className="grid h-fit gap-2.5 rounded-2xl bg-surface-2 p-4">
        {fila(contado ? "Pagos" : "Enganche restante a la firma", dinero2(contado ? num(f.enganche) ?? 0 : c.engancheRestante))}
        {contado ? null : fila("Desembolso esperado", dinero2(c.desembolsoEsperado))}
        {c.diferenciaDesembolso != null && c.diferenciaDesembolso !== 0 ? fila("Diferencia del desembolso", dinero2(c.diferenciaDesembolso)) : null}
        {fila("Total a cubrir (factura + extras)", dinero2(c.total))}
        {fila("Cubierto", dinero2(c.cubierto))}
        <div className={cx("mt-1 grid gap-1 rounded-xl px-4 py-3", !c.completo ? "bg-surface" : c.sale ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad")}>
          <span className="text-[0.8rem] font-semibold">{!c.completo ? "Captura el valor factura" : c.sale ? (c.saldo > 0 ? `Sin adeudo · saldo a favor de ${dinero2(c.saldo)} (queda en Accesorios)` : "Sin adeudo") : "Hay adeudo: el carro no sale"}</span>
          <span className="num text-[2rem]">{c.completo ? dinero2(Math.abs(c.saldo)) : "—"}</span>
        </div>
        <Boton disabled={ocupado} onClick={() => iniciar(async () => {
          const r = await guardarCuadre(venta.id, datos);
          avisar(r.ok ? r.mensaje ?? "Guardado" : r.error, r.ok ? "ok" : "error");
          if (r.ok) router.refresh();
        })}>{ocupado ? "Guardando…" : "Guardar cuadre"}</Boton>
      </div>
    </div>
  );
}
