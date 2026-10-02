"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirSesion } from "@/lib/sesion";
import { rangoMes } from "@/lib/dominio/fechas";
import type { Resultado } from "@/lib/tipos";

const Entrada = z.object({
  mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  unidades: z.record(z.string(), z.number().int().min(0).max(999)),
  productos: z.record(z.string(), z.number().int().min(0).max(100)),
});

export async function guardarMetas(entrada: z.input<typeof Entrada>): Promise<Resultado> {
  const s = await requerirSesion();
  if (!s.direccion) return { ok: false, error: "Solo dirección define las metas." };
  const r = Entrada.safeParse(entrada);
  if (!r.success) return { ok: false, error: "Revisa las metas: unidades de 0 a 999 y porcentajes de 0 a 100." };
  const mes = rangoMes(r.data.mes).desde;
  const filasU = Object.entries(r.data.unidades).map(([vendedor_id, unidades]) => ({ agencia_id: s.agencia.id, mes, vendedor_id, unidades }));
  const filasP = Object.entries(r.data.productos).map(([producto_id, porcentaje]) => ({ agencia_id: s.agencia.id, mes, producto_id, porcentaje }));
  if (filasU.length) {
    const { error } = await s.sb.from("metas").upsert(filasU, { onConflict: "agencia_id,mes,vendedor_id" });
    if (error) return { ok: false, error: "No se pudieron guardar las metas: " + error.message };
  }
  if (filasP.length) {
    const { error } = await s.sb.from("metas_producto").upsert(filasP, { onConflict: "agencia_id,mes,producto_id" });
    if (error) return { ok: false, error: "No se pudieron guardar las metas por producto: " + error.message };
  }
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Metas guardadas" };
}
