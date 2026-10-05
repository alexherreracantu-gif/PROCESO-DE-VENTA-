"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirDireccion } from "@/lib/sesion";
import { esMes, rangoMes } from "@/lib/dominio/fechas";
import type { Resultado } from "@/lib/tipos";

const Pieza = z.object({
  mes: z.string().refine(esMes, "Mes inválido"),
  modeloId: z.string().regex(/^[0-9a-f-]{36}$/i).nullable(),
  titulo: z.string().trim().min(1, "Ponle un nombre al anuncio.").max(80),
  datos: z.string().min(100).max(6_000_000),
  miniatura: z.string().min(100).max(400_000),
});

/** Dirección sube una pieza oficial de la campaña del mes (ya comprimida en el navegador). */
export async function subirAnuncioOficial(e: z.input<typeof Pieza>): Promise<Resultado> {
  const s = await requerirDireccion();
  const r = Pieza.safeParse(e);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Revisa la imagen." };
  const { error } = await s.sb.from("anuncios_oficiales").insert({
    agencia_id: s.agencia.id, mes: rangoMes(r.data.mes).desde, modelo_id: r.data.modeloId, titulo: r.data.titulo,
    mime: "image/jpeg", datos: r.data.datos, miniatura: r.data.miniatura,
  });
  if (error) return { ok: false, error: "No se pudo guardar: " + error.message };
  revalidatePath("/anuncios");
  return { ok: true, mensaje: "Anuncio agregado" };
}

export async function quitarAnuncioOficial(id: string): Promise<Resultado> {
  const s = await requerirDireccion();
  const { error, count } = await s.sb.from("anuncios_oficiales").delete({ count: "exact" }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo quitar: " + error.message };
  if (!count) return { ok: false, error: "No se encontró el anuncio." };
  revalidatePath("/anuncios");
  return { ok: true, mensaje: "Anuncio quitado" };
}
