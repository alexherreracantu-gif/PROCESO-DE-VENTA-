"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirSesion } from "@/lib/sesion";
import { esMes, rangoMes } from "@/lib/dominio/fechas";
import type { Resultado } from "@/lib/tipos";

const Filas = z.array(z.object({ canal: z.string().trim().min(1).max(40), monto: z.number().nonnegative().max(10_000_000).nullable() })).max(20);

/** Lo que el usuario invirtió en publicidad este mes, por canal (vacío o 0 = se quita). */
export async function guardarInversion(mes: string, filas: z.input<typeof Filas>): Promise<Resultado> {
  const s = await requerirSesion();
  if (!esMes(mes)) return { ok: false, error: "Mes inválido." };
  const r = Filas.safeParse(filas);
  if (!r.success) return { ok: false, error: "Revisa los montos: deben ser números positivos." };
  const { desde } = rangoMes(mes);
  const conMonto = r.data.filter((f) => f.monto);
  const sinMonto = r.data.filter((f) => !f.monto).map((f) => f.canal);
  if (conMonto.length) {
    const { error } = await s.sb.from("inversion_publicidad").upsert(
      conMonto.map((f) => ({ agencia_id: s.agencia.id, usuario_id: s.perfil.id, mes: desde, canal: f.canal, monto: f.monto })),
      { onConflict: "usuario_id,mes,canal" });
    if (error) return { ok: false, error: "No se pudo guardar: " + error.message };
  }
  if (sinMonto.length) await s.sb.from("inversion_publicidad").delete().eq("usuario_id", s.perfil.id).eq("mes", desde).in("canal", sinMonto);
  revalidatePath("/resultados");
  return { ok: true, mensaje: "Inversión guardada" };
}
