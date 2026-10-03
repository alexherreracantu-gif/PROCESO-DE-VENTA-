"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirSesion } from "@/lib/sesion";
import { COLORES, ESTATUS, FORMAS_PAGO, PLAZAS } from "@/lib/dominio/catalogos";
import { borrarArchivos } from "@/lib/expedientes";
import { normalizarVin, VIN_RE } from "@/lib/dominio/vin";
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
  origen: opcional(40),
});
export type EntradaVenta = z.input<typeof EntradaVenta>;

function mensajeError(e: { message: string; code?: string }): string {
  if (e.code === "23505" || /ventas_vin_unico/.test(e.message)) return "Ese VIN ya está registrado en otra venta.";
  if (/no pertenece/.test(e.message)) return e.message + ".";
  if (/row-level security|permission|42501/.test(e.message + (e.code ?? ""))) return "No tienes permiso para registrar o editar esa venta.";
  return "No se pudo guardar: " + e.message;
}

export async function guardarVenta(entrada: EntradaVenta): Promise<Resultado> {
  const s = await requerirSesion();
  const r = EntradaVenta.safeParse(entrada);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Revisa los datos." };
  const { id: ventaId, productos, prospecto_id, ...datos } = r.data;
  if (!s.direccion && datos.vendedor_id !== s.perfil.id) return { ok: false, error: "Solo puedes registrar ventas a tu nombre." };

  // Venta, productos y prospecto se guardan en una sola transacción (función guardar_venta).
  const { data, error } = await s.sb.rpc("guardar_venta", { p_venta: { ...datos, id: ventaId ?? null }, p_productos: productos, p_prospecto: prospecto_id ?? null });
  if (error || !data) return { ok: false, error: mensajeError(error ?? { message: "sin respuesta" }) };
  const idFinal = data as string;

  revalidatePath("/", "layout");
  return { ok: true, id: idFinal, mensaje: ventaId ? "Venta actualizada" : "Venta registrada" };
}

export async function borrarVenta(ventaId: string): Promise<Resultado> {
  const s = await requerirSesion();
  if (!s.direccion) return { ok: false, error: "Solo dirección puede borrar ventas. Márcala como cancelada." };
  const { data: docs } = await s.sb.from("venta_documentos").select("ruta").eq("venta_id", ventaId).not("ruta", "is", null);
  const { error, count } = await s.sb.from("ventas").delete({ count: "exact" }).eq("id", ventaId);
  if (error) return { ok: false, error: mensajeError(error) };
  if (!count) return { ok: false, error: "No se encontró la venta." };
  // Los registros del expediente se borran en cascada; aquí se limpian sus archivos.
  await borrarArchivos((docs ?? []).map((d) => d.ruta as string)).catch(() => {});
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Venta borrada" };
}
