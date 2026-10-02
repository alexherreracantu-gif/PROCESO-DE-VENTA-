"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirDireccion } from "@/lib/sesion";

type Resultado = { ok: true } | { ok: false; error: string };
const base64 = /^[A-Za-z0-9+/]+={0,2}$/;

const Foto = z.object({
  modeloId: z.string().uuid(),
  posicion: z.number().int().min(1).max(4),
  datos: z.string().max(4_000_000, "La foto es demasiado grande.").regex(base64, "Archivo inválido."),
  miniatura: z.string().max(400_000).regex(base64, "Archivo inválido."),
  ancho: z.number().int().positive().max(10000),
  alto: z.number().int().positive().max(10000),
});

/** Sube o reemplaza una de las 4 fotos de un modelo (ya comprimida en el navegador). */
export async function guardarFoto(e: z.input<typeof Foto>): Promise<Resultado> {
  const s = await requerirDireccion();
  const r = Foto.safeParse(e);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Revisa la foto." };
  const { modeloId, posicion, datos, miniatura, ancho, alto } = r.data;
  const { error } = await s.sb.from("modelo_fotos").upsert(
    { modelo_id: modeloId, posicion, agencia_id: s.agencia.id, mime: "image/jpeg", datos, miniatura, ancho, alto, updated_at: new Date().toISOString() },
    { onConflict: "modelo_id,posicion" },
  );
  if (error) return { ok: false, error: "No se pudo guardar la foto: " + error.message };
  revalidatePath("/fotos");
  return { ok: true };
}

export async function quitarFoto(modeloId: string, posicion: number): Promise<Resultado> {
  const s = await requerirDireccion();
  const { error } = await s.sb.from("modelo_fotos").delete().eq("modelo_id", modeloId).eq("posicion", posicion);
  if (error) return { ok: false, error: "No se pudo quitar la foto: " + error.message };
  revalidatePath("/fotos");
  return { ok: true };
}
