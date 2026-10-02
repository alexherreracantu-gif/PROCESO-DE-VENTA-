"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirDireccion } from "@/lib/sesion";
import type { Resultado } from "@/lib/tipos";

const dinero = z.number().nonnegative().max(50_000_000);
const clave = (n: string) => n.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

const Modelo = z.object({
  id: z.string().optional(),
  nombre: z.string().trim().min(1, "Escribe el nombre del modelo.").max(60),
  anio: z.number().int().min(2015).max(2100),
  motor: z.enum(["electrico", "hibrido"]),
  precio: dinero,
  bono: dinero,
  descripcion: z.string().trim().max(240).optional().nullable(),
  activo: z.boolean(),
  orden: z.number().int().min(0).max(999),
});

export async function guardarModelo(e: z.input<typeof Modelo>): Promise<Resultado> {
  const s = await requerirDireccion();
  const r = Modelo.safeParse(e);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Revisa los datos del modelo." };
  const { id, ...d } = r.data;
  const res = id
    ? await s.sb.from("modelos").update(d).eq("id", id)
    : await s.sb.from("modelos").insert({ ...d, clave: `${clave(d.nombre)}-${d.anio}` });
  if (res.error) return { ok: false, error: /duplicate|unique/.test(res.error.message) ? "Ya existe ese modelo con ese año." : "No se pudo guardar: " + res.error.message };
  revalidatePath("/", "layout");
  return { ok: true, mensaje: id ? "Modelo actualizado" : "Modelo agregado" };
}

const Producto = z.object({
  id: z.string().optional(),
  nombre: z.string().trim().min(1, "Escribe el nombre del producto.").max(60),
  nombre_corto: z.string().trim().min(1).max(20),
  precio: dinero.nullable(),
  activo: z.boolean(),
  orden: z.number().int().min(0).max(999),
});

export async function guardarProducto(e: z.input<typeof Producto>): Promise<Resultado> {
  const s = await requerirDireccion();
  const r = Producto.safeParse(e);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Revisa los datos del producto." };
  const { id, ...d } = r.data;
  const res = id ? await s.sb.from("productos").update(d).eq("id", id) : await s.sb.from("productos").insert({ ...d, clave: clave(d.nombre) });
  if (res.error) return { ok: false, error: /duplicate|unique/.test(res.error.message) ? "Ya existe un producto con ese nombre." : "No se pudo guardar: " + res.error.message };
  revalidatePath("/", "layout");
  return { ok: true, mensaje: id ? "Producto actualizado" : "Producto agregado" };
}

const Parametros = z.object({
  placas_electrico: dinero, placas_hibrido: dinero, gestoria: dinero, permiso_frontera: dinero, separacion: dinero, garantia_extendida: dinero,
  meta_unidades: z.number().int().min(0).max(999), meta_producto: z.number().int().min(0).max(100),
});

export async function guardarParametros(e: z.input<typeof Parametros>): Promise<Resultado> {
  const s = await requerirDireccion();
  const r = Parametros.safeParse(e);
  if (!r.success) return { ok: false, error: "Revisa los montos: deben ser números positivos." };
  const { error } = await s.sb.from("agencias").update({ parametros: { ...s.agencia.parametros, ...r.data } }).eq("id", s.agencia.id);
  if (error) return { ok: false, error: "No se pudo guardar: " + error.message };
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Parámetros guardados" };
}
