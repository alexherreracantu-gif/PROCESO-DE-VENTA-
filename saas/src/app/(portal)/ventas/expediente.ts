"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirSesion, type Sesion } from "@/lib/sesion";
import { venta as leerVenta, catalogo } from "@/lib/datos";
import { hoy } from "@/lib/dominio/fechas";
import { BANCOS, CARGO_DE_PRODUCTO, esConceptoCargo, esOrigen, FORMAS_COBRO, labelCargo } from "@/lib/dominio/cuenta";
import { NO_APLICA, procesoDeVenta, requisito, TIPOS_DOCUMENTO } from "@/lib/dominio/proceso";
import { borrarArchivos, existeArchivo, extensionValida, MAX_ARCHIVO, rutaNueva, urlDeSubida } from "@/lib/expedientes";
import type { Resultado } from "@/lib/tipos";

const id = z.string().regex(/^[0-9a-f-]{36}$/i, "Identificador inválido");
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");
const tipoDoc = z.string().refine((t) => TIPOS_DOCUMENTO.includes(t), "Tipo de documento desconocido");
const texto = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));

function mensaje(e: { message: string; code?: string }): string {
  if (/row-level security|permission|42501/.test(e.message + (e.code ?? ""))) return "No tienes permiso para cambiar el expediente de esta venta.";
  if (/no pertenece|no corresponde/.test(e.message)) return e.message + ".";
  return "No se pudo guardar: " + e.message;
}

/** La venta, si quien pide la puede ver (los permisos de la base deciden). */
async function ventaVisible(s: Sesion, ventaId: string) {
  const { data } = await s.sb.from("ventas").select("id, agencia_id, estatus").eq("id", ventaId).maybeSingle<{ id: string; agencia_id: string; estatus: string }>();
  return data;
}

function refrescar(ventaId: string) {
  revalidatePath(`/ventas/${ventaId}`);
  revalidatePath("/ventas");
  revalidatePath("/inicio");
}

/** Cuando entra la factura, la venta pasa de Apartada a Facturada. */
async function subirEstatusPorFactura(s: Sesion, ventaId: string, tipo: string, estatus: string) {
  if (tipo === "factura" && estatus === "apartada") await s.sb.from("ventas").update({ estatus: "facturada" }).eq("id", ventaId);
}

// ---------------------------------------------------------------------
// Documentos
// ---------------------------------------------------------------------

const EntradaSubida = z.object({
  ventaId: id, tipo: tipoDoc, movimientoId: id.optional().nullable(),
  nombre: z.string().trim().min(1).max(200), tamano: z.number().int().positive(), mime: z.string().max(120).optional().nullable(),
});

/** Paso 1: revisa permisos y devuelve una URL firmada para subir el archivo directo a Storage. */
export async function prepararSubida(entrada: z.input<typeof EntradaSubida>): Promise<{ ok: true; ruta: string; url: string } | { ok: false; error: string }> {
  const s = await requerirSesion();
  const r = EntradaSubida.safeParse(entrada);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Revisa el archivo." };
  if (!extensionValida(r.data.nombre)) return { ok: false, error: "Sube PDF, imagen (JPG, PNG, HEIC), Excel, Word o XML." };
  if (r.data.tamano > MAX_ARCHIVO) return { ok: false, error: `El archivo pesa más de ${MAX_ARCHIVO / 1024 / 1024} MB. Compártelo como enlace de Drive.` };
  const v = await ventaVisible(s, r.data.ventaId);
  if (!v) return { ok: false, error: "No se encontró la venta." };
  try {
    const ruta = rutaNueva(v.agencia_id, v.id, r.data.nombre);
    return { ok: true, ruta, url: await urlDeSubida(ruta) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo preparar la subida." };
  }
}

const EntradaConfirmar = EntradaSubida.extend({ ruta: z.string().min(10).max(400) });

/** Paso 2: el archivo ya subió; se registra en el expediente. */
export async function confirmarSubida(entrada: z.input<typeof EntradaConfirmar>): Promise<Resultado> {
  const s = await requerirSesion();
  const r = EntradaConfirmar.safeParse(entrada);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Revisa el archivo." };
  const d = r.data;
  const v = await ventaVisible(s, d.ventaId);
  if (!v) return { ok: false, error: "No se encontró la venta." };
  if (!d.ruta.startsWith(`${v.agencia_id}/${v.id}/`)) return { ok: false, error: "El archivo no corresponde a esta venta." };
  if (!(await existeArchivo(d.ruta))) return { ok: false, error: "El archivo no terminó de subir. Inténtalo otra vez." };
  const { error } = await s.sb.from("venta_documentos").insert({
    venta_id: v.id, agencia_id: v.agencia_id, tipo: d.tipo, movimiento_id: d.movimientoId ?? null,
    nombre: d.nombre, ruta: d.ruta, mime: d.mime || null, tamano: d.tamano,
  });
  if (error) { await borrarArchivos([d.ruta]); return { ok: false, error: mensaje(error) }; }
  await subirEstatusPorFactura(s, v.id, d.tipo, v.estatus);
  refrescar(v.id);
  return { ok: true, mensaje: "Archivo guardado" };
}

const EntradaEnlace = z.object({
  ventaId: id, tipo: tipoDoc, movimientoId: id.optional().nullable(),
  enlace: z.string().trim().max(1000).url("Pega un enlace completo (https://…)").refine((u) => u.startsWith("https://"), "El enlace debe empezar con https://"),
  nombre: texto(200),
});

/** Para lo que ya está en Google Drive: se guarda el enlace en lugar del archivo. */
export async function agregarEnlace(entrada: z.input<typeof EntradaEnlace>): Promise<Resultado> {
  const s = await requerirSesion();
  const r = EntradaEnlace.safeParse(entrada);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Revisa el enlace." };
  const v = await ventaVisible(s, r.data.ventaId);
  if (!v) return { ok: false, error: "No se encontró la venta." };
  const nombre = r.data.nombre ?? (/drive\.google|docs\.google/.test(r.data.enlace) ? "Enlace de Google Drive" : new URL(r.data.enlace).hostname);
  const { error } = await s.sb.from("venta_documentos").insert({
    venta_id: v.id, agencia_id: v.agencia_id, tipo: r.data.tipo, movimiento_id: r.data.movimientoId ?? null, nombre, enlace: r.data.enlace,
  });
  if (error) return { ok: false, error: mensaje(error) };
  await subirEstatusPorFactura(s, v.id, r.data.tipo, v.estatus);
  refrescar(v.id);
  return { ok: true, mensaje: "Enlace guardado" };
}

export async function quitarDocumento(docId: string): Promise<Resultado> {
  const s = await requerirSesion();
  if (!id.safeParse(docId).success) return { ok: false, error: "Identificador inválido" };
  const { data } = await s.sb.from("venta_documentos").select("id, venta_id, ruta").eq("id", docId).maybeSingle<{ id: string; venta_id: string; ruta: string | null }>();
  if (!data) return { ok: false, error: "No se encontró el archivo." };
  const { error, count } = await s.sb.from("venta_documentos").delete({ count: "exact" }).eq("id", docId);
  if (error) return { ok: false, error: mensaje(error) };
  if (!count) return { ok: false, error: "No tienes permiso para quitar ese archivo." };
  if (data.ruta) await borrarArchivos([data.ruta]).catch(() => {});
  refrescar(data.venta_id);
  return { ok: true, mensaje: "Archivo quitado" };
}

// ---------------------------------------------------------------------
// Requisitos (pasos, "en físico", "no aplica")
// ---------------------------------------------------------------------

/**
 * Marca un requisito: "hecho" (paso cumplido o documento entregado en físico), "na" (no aplica)
 * o null (pendiente). "Unidad entregada" exige el expediente al 100%; dirección puede forzarlo.
 */
export async function marcarRequisito(ventaId: string, reqId: string, estado: "hecho" | "na" | null, forzar = false): Promise<Resultado> {
  const s = await requerirSesion();
  const req = requisito(reqId);
  if (!req || req.tipo === "auto") return { ok: false, error: "Ese requisito se calcula solo." };
  if (estado === "na" && reqId === "entrega") return { ok: false, error: "La entrega no puede marcarse como “no aplica”." };
  const [v, cat] = await Promise.all([leerVenta(s, ventaId), catalogo(s, true)]);
  if (!v) return { ok: false, error: "No se encontró la venta." };

  const expediente = { ...v.expediente };
  if (estado === "hecho") expediente[reqId] = hoy();
  else if (estado === "na") expediente[reqId] = NO_APLICA;
  else delete expediente[reqId];

  const cambios: Record<string, unknown> = { expediente };
  if (reqId === "entrega") {
    if (estado === "hecho") {
      const p = procesoDeVenta(v, cat.productos);
      const faltan = p.pendientes.filter((x) => x.id !== "entrega");
      if (faltan.length && !(forzar && s.direccion)) {
        return { ok: false, error: `Faltan ${faltan.length} ${faltan.length === 1 ? "pendiente" : "pendientes"} para entregar: ${faltan.slice(0, 4).map((x) => x.label).join(", ")}${faltan.length > 4 ? "…" : ""}.` };
      }
      cambios.estatus = "entregada";
      if (!v.fecha_entrega) cambios.fecha_entrega = hoy();
    } else if (v.estatus === "entregada") {
      cambios.estatus = "facturada";
    }
  }
  const { error } = await s.sb.from("ventas").update(cambios).eq("id", v.id);
  if (error) return { ok: false, error: mensaje(error) };
  refrescar(v.id);
  return { ok: true, mensaje: reqId === "entrega" && estado === "hecho" ? "¡Unidad entregada!" : undefined };
}

// ---------------------------------------------------------------------
// Cuenta del cliente
// ---------------------------------------------------------------------

const monto = z.number({ message: "Escribe el monto." }).positive("El monto debe ser mayor a cero.").max(50_000_000);
const EntradaMovimiento = z.object({
  id: id.optional().nullable(),
  ventaId: id,
  tipo: z.enum(["cargo", "pago"]),
  concepto: z.string(),
  aplica_a: z.string().optional().nullable(),
  monto,
  fecha,
  forma: z.string().optional().nullable().transform((v) => (v ? v : null)).refine((v) => !v || (FORMAS_COBRO as readonly string[]).includes(v), "Forma de pago desconocida"),
  referencia: texto(80),
  notas: texto(300),
}).superRefine((m, c) => {
  if (m.tipo === "cargo" && (!esConceptoCargo(m.concepto) || m.concepto === "factura")) c.addIssue({ code: "custom", message: "Elige el concepto del cargo." });
  if (m.tipo === "pago" && !esOrigen(m.concepto)) c.addIssue({ code: "custom", message: "Elige de dónde viene el pago." });
  if (m.tipo === "pago" && m.aplica_a && !esConceptoCargo(m.aplica_a)) c.addIssue({ code: "custom", message: "Elige a qué concepto se aplica." });
});
export type EntradaMovimiento = z.input<typeof EntradaMovimiento>;

export async function guardarMovimiento(entrada: EntradaMovimiento): Promise<Resultado> {
  const s = await requerirSesion();
  const r = EntradaMovimiento.safeParse(entrada);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Revisa los datos." };
  const { id: movId, ventaId, ...m } = r.data;
  const v = await ventaVisible(s, ventaId);
  if (!v) return { ok: false, error: "No se encontró la venta." };
  const fila = { ...m, aplica_a: m.tipo === "pago" ? m.aplica_a || "factura" : null, forma: m.tipo === "pago" ? m.forma : null };
  const q = movId
    ? s.sb.from("venta_movimientos").update(fila, { count: "exact" }).eq("id", movId).eq("venta_id", v.id)
    : s.sb.from("venta_movimientos").insert({ ...fila, venta_id: v.id, agencia_id: v.agencia_id }, { count: "exact" });
  const { error, count } = await q;
  if (error) return { ok: false, error: mensaje(error) };
  if (!count) return { ok: false, error: "No se encontró el movimiento." };
  refrescar(v.id);
  return { ok: true, mensaje: movId ? "Movimiento actualizado" : m.tipo === "cargo" ? "Cargo agregado" : "Pago registrado" };
}

export async function borrarMovimiento(movId: string): Promise<Resultado> {
  const s = await requerirSesion();
  if (!id.safeParse(movId).success) return { ok: false, error: "Identificador inválido" };
  const { data } = await s.sb.from("venta_movimientos").select("id, venta_id").eq("id", movId).maybeSingle<{ id: string; venta_id: string }>();
  if (!data) return { ok: false, error: "No se encontró el movimiento." };
  const { data: docs } = await s.sb.from("venta_documentos").select("ruta").eq("movimiento_id", movId);
  const { error, count } = await s.sb.from("venta_movimientos").delete({ count: "exact" }).eq("id", movId);
  if (error) return { ok: false, error: mensaje(error) };
  if (!count) return { ok: false, error: "No tienes permiso para borrar ese movimiento." };
  // Sus recibos se borran en cascada; aquí se limpian sus archivos.
  await borrarArchivos((docs ?? []).map((d) => d.ruta as string | null).filter((x): x is string => !!x)).catch(() => {});
  refrescar(data.venta_id);
  return { ok: true, mensaje: "Movimiento borrado" };
}

/** Agrega a la cuenta un cargo por cada producto vendido que todavía no lo tenga (precio de catálogo). */
export async function cargosDeProductos(ventaId: string): Promise<Resultado> {
  const s = await requerirSesion();
  const [v, cat] = await Promise.all([leerVenta(s, ventaId), catalogo(s, true)]);
  if (!v) return { ok: false, error: "No se encontró la venta." };
  const hay = new Set(v.movimientos.filter((m) => m.tipo === "cargo").map((m) => m.concepto));
  const nuevos = cat.productos
    .filter((p) => v.productos.includes(p.id) && CARGO_DE_PRODUCTO[p.clave] && p.precio && p.precio > 0)
    .map((p) => ({ concepto: CARGO_DE_PRODUCTO[p.clave], monto: p.precio as number, notas: p.nombre === labelCargo(CARGO_DE_PRODUCTO[p.clave]) ? null : p.nombre }))
    .filter((c, i, arr) => !hay.has(c.concepto) && arr.findIndex((x) => x.concepto === c.concepto) === i);
  if (!nuevos.length) return { ok: false, error: "No hay productos vendidos con precio de catálogo pendientes de cargar. Agrégalos a mano." };
  const { error } = await s.sb.from("venta_movimientos").insert(nuevos.map((c) => ({ ...c, tipo: "cargo", venta_id: v.id, agencia_id: s.agencia.id, fecha: hoy() })));
  if (error) return { ok: false, error: mensaje(error) };
  refrescar(v.id);
  return { ok: true, mensaje: `${nuevos.length} ${nuevos.length === 1 ? "cargo agregado" : "cargos agregados"}: revisa los precios.` };
}

const montoOpcional = z.number().nonnegative().max(50_000_000).nullable().optional();
const EntradaCredito = z.object({
  banco: z.string().optional().nullable().transform((v) => (v ? v : null)).refine((v) => !v || (BANCOS as readonly string[]).includes(v), "Banco desconocido"),
  monto: montoOpcional, enganche: montoOpcional,
  plazo: z.number().int().min(6).max(96).nullable().optional(),
  tasa: z.number().min(0).max(60).nullable().optional(),
  fecha: fecha.optional().nullable().or(z.literal("")).transform((v) => (v ? v : null)),
});

/** Datos de la carta de aprobación: banco, monto financiado, enganche, plazo y tasa (%). */
export async function guardarCredito(ventaId: string, entrada: z.input<typeof EntradaCredito>): Promise<Resultado> {
  const s = await requerirSesion();
  const r = EntradaCredito.safeParse(entrada);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Revisa los datos del crédito." };
  const credito = Object.fromEntries(Object.entries(r.data).filter(([, v]) => v != null));
  const { error, count } = await s.sb.from("ventas").update({ credito }, { count: "exact" }).eq("id", ventaId);
  if (error) return { ok: false, error: mensaje(error) };
  if (!count) return { ok: false, error: "No se encontró la venta." };
  refrescar(ventaId);
  return { ok: true, mensaje: "Datos del crédito guardados" };
}

/** Valor factura (el cargo principal de la cuenta). */
export async function guardarValorFactura(ventaId: string, valor: number | null): Promise<Resultado> {
  const s = await requerirSesion();
  const r = z.number().positive().max(50_000_000).nullable().safeParse(valor);
  if (!r.success) return { ok: false, error: "Escribe un valor factura válido." };
  const { error, count } = await s.sb.from("ventas").update({ valor_factura: r.data }, { count: "exact" }).eq("id", ventaId);
  if (error) return { ok: false, error: mensaje(error) };
  if (!count) return { ok: false, error: "No se encontró la venta." };
  refrescar(ventaId);
  return { ok: true, mensaje: "Valor factura guardado" };
}
