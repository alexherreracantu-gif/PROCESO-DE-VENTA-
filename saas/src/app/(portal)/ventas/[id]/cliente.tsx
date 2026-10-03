"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Boton, BotonEnlace } from "@/components/ui";
import { Confirmar, useAviso } from "@/components/cliente";
import { FormularioVenta, type ContextoVenta } from "@/components/ventas/formulario-venta";
import { enlaceWhatsApp } from "@/lib/dominio/formato";
import { borrarVenta } from "../acciones";
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
