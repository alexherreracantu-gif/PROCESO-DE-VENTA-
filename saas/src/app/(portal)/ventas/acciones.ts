"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirSesion } from "@/lib/sesion";
import { COLORES, ESTATUS, FORMAS_PAGO, PASOS_EXPEDIENTE, PLAZAS } from "@/lib/dominio/catalogos";
import { normalizarVin, VIN_RE } from "@/lib/dominio/vin";
import { hoy } from "@/lib/dominio/fechas";
import type { Resultado } from "@/lib/tipos";

const id = z.string().regex(/^[0-9a-f-]{36}$/i, "Identificador inválido");
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");
const opcional = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));

const EntradaVenta = z.object({
  id: id.optional(),
  fecha,
  vendedor_id: id,
  cliente: z.string().trim().min(1, "Escribe el nombre del cliente.").max(120),
  num_cliente: opcional(40),
  telefono: opcional(20),
  vin: z.string().optional().nullable().transform((v) => normalizarVin(v)).refine((v) => !v || VIN_RE.test(v), "El VIN debe tener 17 caracteres, sin I, O ni Q."),
  modelo_id: id,
  color: z.enum(COLORES.map((c) => c.id) as [string, ...string[]], { message: "Elige el color de la unidad." }),
  color_nombre: opcional(40),
  forma_pago: z.enum(FORMAS_PAGO),
  plaza: z.enum(PLAZAS),
  estatus: z.enum(ESTATUS.map((e) => e.id) as ["apartada", "facturada", "entregada", "cancelada"]),
  fecha_entrega: fecha.optional().nullable().or(z.literal("")).transform((v) => (v ? v : null)),
  valor_factura: z.number().nonnegative().max(10_000_000).optional().nullable(),
  notas: opcional(1000),
  productos: z.array(id).max(30),
  prospecto_id: id.optional().nullable(),
});
export type EntradaVenta = z.input<typeof EntradaVenta>;

function mensajeError(e: { message: string; code?: string }): string {
  if (e.code === "23505" || /ventas_vin_unico/.test(e.message)) return "Ese VIN ya está registrado en otra venta.";
  if (/no pertenece/.test(e.message)) return e.message + ".";
  if (/row-level security|permission/.test(e.message)) return "No tienes permiso para registrar ventas a nombre de otra persona.";
  return "No se pudo guardar: " + e.message;
}

export async function guardarVenta(entrada: EntradaVenta): Promise<Resultado> {
  const s = await requerirSesion();
  const r = EntradaVenta.safeParse(entrada);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Revisa los datos." };
  const { id: ventaId, productos, prospecto_id, ...datos } = r.data;
  if (!s.direccion && datos.vendedor_id !== s.perfil.id) return { ok: false, error: "Solo puedes registrar ventas a tu nombre." };

  let idFinal = ventaId;
  if (ventaId) {
    const { error } = await s.sb.from("ventas").update(datos).eq("id", ventaId);
    if (error) return { ok: false, error: mensajeError(error) };
  } else {
    const expediente = { cliente: datos.fecha };
    const { data, error } = await s.sb.from("ventas").insert({ ...datos, expediente }).select("id").single();
    if (error || !data) return { ok: false, error: mensajeError(error ?? { message: "sin respuesta" }) };
    idFinal = data.id as string;
  }

  // Productos: se guarda el precio de catálogo del momento.
  const precios = new Map<string, number | null>();
  if (productos.length) {
    const { data: catalogo } = await s.sb.from("productos").select("id, precio").in("id", productos);
    (catalogo ?? []).forEach((p) => precios.set(p.id as string, p.precio as number | null));
  }
  const { error: e1 } = await s.sb.from("venta_productos").delete().eq("venta_id", idFinal!);
  if (e1) return { ok: false, error: mensajeError(e1) };
  if (productos.length) {
    const { error: e2 } = await s.sb.from("venta_productos").insert(productos.map((p) => ({ venta_id: idFinal, producto_id: p, precio: precios.get(p) ?? null })));
    if (e2) return { ok: false, error: mensajeError(e2) };
  }
  if (prospecto_id) await s.sb.from("prospectos").update({ venta_id: idFinal, etapa: datos.estatus === "entregada" ? "entregado" : "apartado" }).eq("id", prospecto_id);

  revalidatePath("/", "layout");
  return { ok: true, id: idFinal, mensaje: ventaId ? "Venta actualizada" : "Venta registrada" };
}

export async function borrarVenta(ventaId: string): Promise<Resultado> {
  const s = await requerirSesion();
  if (!s.direccion) return { ok: false, error: "Solo dirección puede borrar ventas. Márcala como cancelada." };
  const { error, count } = await s.sb.from("ventas").delete({ count: "exact" }).eq("id", ventaId);
  if (error) return { ok: false, error: mensajeError(error) };
  if (!count) return { ok: false, error: "No se encontró la venta." };
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Venta borrada" };
}

const PASOS = PASOS_EXPEDIENTE.map((p) => p.id) as string[];
export async function marcarPaso(ventaId: string, paso: string, hecho: boolean): Promise<Resultado> {
  const s = await requerirSesion();
  if (!PASOS.includes(paso)) return { ok: false, error: "Paso desconocido." };
  const { data, error } = await s.sb.from("ventas").select("expediente").eq("id", ventaId).maybeSingle();
  if (error || !data) return { ok: false, error: "No se encontró la venta." };
  const expediente = { ...(data.expediente as Record<string, string>) };
  if (hecho) expediente[paso] = hoy(); else delete expediente[paso];
  const { error: e2 } = await s.sb.from("ventas").update({ expediente }).eq("id", ventaId);
  if (e2) return { ok: false, error: mensajeError(e2) };
  revalidatePath("/", "layout");
  return { ok: true };
}
