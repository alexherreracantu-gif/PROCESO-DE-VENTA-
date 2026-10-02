"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Trash2 } from "lucide-react";
import { Boton, BotonEnlace, cx } from "@/components/ui";
import { Confirmar, useAviso } from "@/components/cliente";
import { FormularioVenta, type ContextoVenta } from "@/components/ventas/formulario-venta";
import { pasosAplicables } from "@/lib/dominio/catalogos";
import { fechaCorta } from "@/lib/dominio/fechas";
import { enlaceWhatsApp } from "@/lib/dominio/formato";
import { borrarVenta, marcarPaso } from "../acciones";
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
