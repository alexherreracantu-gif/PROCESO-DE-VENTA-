"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirDireccion, requerirSesion } from "@/lib/sesion";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Resultado } from "@/lib/tipos";

const monto = z.number().nonnegative().max(10_000_000).nullable().optional();
const pct = z.number().min(0).max(100).nullable().optional();
const Esquema = z.object({
  por_unidad: monto,
  pct_factura: pct,
  bono_meta: monto,
  productos: z.record(z.string().regex(/^[a-z0-9_-]{1,40}$/), z.object({ fijo: monto, pct })),
});

/** Cómo se pagan las comisiones en la agencia (lo define dirección). */
export async function guardarEsquema(e: z.input<typeof Esquema>): Promise<Resultado> {
  const s = await requerirDireccion();
  const r = Esquema.safeParse(e);
  if (!r.success) return { ok: false, error: "Revisa los montos: deben ser números positivos (porcentajes de 0 a 100)." };
  const actual = s.agencia.parametros.comisiones ?? {};
  const { error } = await s.sb.from("agencias").update({ parametros: { ...s.agencia.parametros, comisiones: { ...actual, ...r.data } } }).eq("id", s.agencia.id);
  if (error) return { ok: false, error: "No se pudo guardar: " + error.message };
  revalidatePath("/comisiones");
  return { ok: true, mensaje: "Esquema de comisiones guardado" };
}

/** Meta personal de ingreso del mes: cada quien pone la suya. */
export async function guardarMetaIngreso(valor: number | null): Promise<Resultado> {
  const s = await requerirSesion();
  const r = monto.safeParse(valor);
  if (!r.success) return { ok: false, error: "Escribe un monto válido." };
  const admin = supabaseAdmin();
  // Se lee de nuevo para no pisar cambios de otros usuarios.
  const { data } = await admin.from("agencias").select("parametros").eq("id", s.agencia.id).single<{ parametros: Record<string, unknown> }>();
  const parametros = data?.parametros ?? {};
  const com = (parametros.comisiones ?? {}) as { metas?: Record<string, number> };
  const metas = { ...(com.metas ?? {}) };
  if (r.data) metas[s.perfil.id] = r.data; else delete metas[s.perfil.id];
  const { error } = await admin.from("agencias").update({ parametros: { ...parametros, comisiones: { ...com, metas } } }).eq("id", s.agencia.id);
  if (error) return { ok: false, error: "No se pudo guardar: " + error.message };
  revalidatePath("/comisiones");
  return { ok: true, mensaje: "Meta guardada" };
}
