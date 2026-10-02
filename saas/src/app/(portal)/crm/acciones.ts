"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirSesion } from "@/lib/sesion";
import { CALORES, ETAPAS } from "@/lib/dominio/catalogos";
import type { Resultado } from "@/lib/tipos";

const id = z.string().regex(/^[0-9a-f-]{36}$/i);
const texto = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));
const Entrada = z.object({
  id: id.optional(),
  asesor_id: id,
  nombre: z.string().trim().min(1, "Escribe el nombre del prospecto.").max(120),
  telefono: texto(20),
  modelo_id: id.optional().nullable().or(z.literal("")).transform((v) => (v ? v : null)),
  etapa: z.enum(ETAPAS.map((e) => e.id) as [string, ...string[]]),
  origen: z.string().trim().min(1).max(40),
  calor: z.enum(CALORES.map((c) => c.id) as [string, ...string[]]),
  siguiente_accion: texto(200),
  fecha_siguiente: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal("")).transform((v) => (v ? v : null)),
  enganche: z.number().nonnegative().max(10_000_000).optional().nullable(),
  toma_a_cuenta: texto(120),
  notas: texto(2000),
});
export type EntradaProspecto = z.input<typeof Entrada>;

export async function guardarProspecto(entrada: EntradaProspecto): Promise<Resultado> {
  const s = await requerirSesion();
  const r = Entrada.safeParse(entrada);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Revisa los datos." };
  const { id: pid, ...datos } = r.data;
  if (!s.direccion && datos.asesor_id !== s.perfil.id) return { ok: false, error: "Solo puedes registrar prospectos a tu nombre." };
  const q = pid ? s.sb.from("prospectos").update(datos).eq("id", pid).select("id").single() : s.sb.from("prospectos").insert(datos).select("id").single();
  const { data, error } = await q;
  if (error || !data) return { ok: false, error: "No se pudo guardar: " + (error?.message ?? "sin respuesta") };
  revalidatePath("/crm"); revalidatePath("/inicio");
  return { ok: true, id: data.id as string, mensaje: pid ? "Prospecto actualizado" : "Prospecto agregado" };
}

export async function moverEtapa(prospectoId: string, etapa: string): Promise<Resultado> {
  const s = await requerirSesion();
  if (!ETAPAS.some((e) => e.id === etapa)) return { ok: false, error: "Etapa desconocida." };
  const { error } = await s.sb.from("prospectos").update({ etapa }).eq("id", prospectoId);
  if (error) return { ok: false, error: "No se pudo mover: " + error.message };
  revalidatePath("/crm");
  return { ok: true };
}

export async function borrarProspecto(prospectoId: string): Promise<Resultado> {
  const s = await requerirSesion();
  const { error, count } = await s.sb.from("prospectos").delete({ count: "exact" }).eq("id", prospectoId);
  if (error) return { ok: false, error: "No se pudo borrar: " + error.message };
  if (!count) return { ok: false, error: "No se encontró el prospecto." };
  revalidatePath("/crm"); revalidatePath("/inicio");
  return { ok: true, mensaje: "Prospecto borrado" };
}
