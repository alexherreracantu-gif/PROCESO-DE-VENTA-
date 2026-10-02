"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirSesion } from "@/lib/sesion";
import { CORTE } from "@/lib/dominio/catalogos";
import type { Resultado } from "@/lib/tipos";

const claves = CORTE.map((c) => c.id) as string[];
const Entrada = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  valores: z.record(z.string(), z.number().int().min(0).max(9999)).refine((v) => Object.keys(v).every((k) => claves.includes(k)), "Concepto desconocido"),
});

export async function guardarCorte(entrada: z.input<typeof Entrada>): Promise<Resultado> {
  const s = await requerirSesion();
  if (!s.perfil.vende) return { ok: false, error: "El corte lo capturan quienes venden." };
  const r = Entrada.safeParse(entrada);
  if (!r.success) return { ok: false, error: "Revisa los números del corte." };
  const { error } = await s.sb.from("cortes").upsert({ fecha: r.data.fecha, usuario_id: s.perfil.id, agencia_id: s.agencia.id, valores: r.data.valores }, { onConflict: "fecha,usuario_id" });
  if (error) return { ok: false, error: "No se pudo guardar el corte: " + error.message };
  revalidatePath("/piso");
  return { ok: true };
}
