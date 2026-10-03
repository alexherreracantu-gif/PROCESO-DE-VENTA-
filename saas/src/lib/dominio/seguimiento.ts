/**
 * Lo que el asesor tiene que mover cada día: mensajes de WhatsApp listos, alertas de expedientes,
 * postventa y comisiones. Funciones puras (se prueban sin base ni navegador).
 */
import { CARGO_DE_PRODUCTO, ORIGENES_CON_RECIBO } from "./cuenta";
import { sumarDias } from "./fechas";
import { dinero2 } from "./formato";
import type { ResultadoProceso } from "./proceso";

const primerNombre = (n: string) => (n.trim().split(/\s+/)[0] ?? "").replace(/^./, (c) => c.toUpperCase());

// ---------------------------------------------------------------------
// WhatsApp: documentos que le faltan al cliente
// ---------------------------------------------------------------------

export type DatosMensaje = { cliente: string; asesor: string; agencia: string; modelo: string; contado: boolean };

/** Mensaje con los documentos y firmas que faltan. null si el cliente ya no debe nada de papeles. */
export function mensajeDocumentos(d: DatosMensaje, p: ResultadoProceso): string | null {
  const pend = p.etapas.flatMap((e) => e.requisitos).filter((r) => r.estado === "pendiente" && r.cliente);
  const docs = pend.filter((r) => r.cliente === "doc").map((r) => r.pedir ?? r.label);
  const firmas = pend.filter((r) => r.cliente === "firma").map((r) => r.pedir ?? r.label);
  // El saldo solo se menciona cuando ya no depende del banco.
  const desembolsoListo = d.contado || p.cuenta.porOrigen.some((o) => o.origen === "desembolso");
  const saldo = p.cuenta.completo && !p.cuenta.sinAdeudo && desembolsoListo ? -p.cuenta.saldo : 0;
  if (!docs.length && !firmas.length && !saldo) return null;
  const lineas = [`Hola ${primerNombre(d.cliente)}, soy ${d.asesor} de ${d.agencia}. Para avanzar con tu ${d.modelo} me falta:`];
  if (docs.length) lineas.push("", "📄 Documentos (foto o PDF por aquí):", ...docs.map((x) => `• ${x}`));
  if (firmas.length) lineas.push("", "✍️ Pasar a firmar en agencia:", ...firmas.map((x) => `• ${x}`));
  if (saldo) lineas.push("", `💳 Saldo pendiente: ${dinero2(saldo)}`);
  lineas.push("", "¡Gracias! Cualquier duda aquí estoy.");
  return lineas.join("\n");
}

// ---------------------------------------------------------------------
// Postventa
// ---------------------------------------------------------------------

export const POSTVENTA = [
  { id: "pv_resena", label: "Reseña en Google", dias: 1, mensaje: (n: string, a: string) => `Hola ${n}, ¿cómo te va con tu BYD? 🚗⚡ Me ayudarías muchísimo con una reseña de 5 estrellas para ${a} en Google. ¡Gracias!` },
  { id: "pv_video", label: "Video o foto de la entrega", dias: 1, mensaje: (n: string) => `Hola ${n}, te comparto el video de tu entrega 🎉 ¿Me das permiso de publicarlo? ¡Gracias por tu confianza!` },
  { id: "pv_llamada", label: "Llamada de satisfacción", dias: 7, mensaje: (n: string) => `Hola ${n}, ¿cómo te ha ido esta primera semana con tu BYD? ¿Alguna duda con la carga o el sistema? Aquí estoy para ayudarte.` },
  { id: "pv_referidos", label: "Pedir 3 referidos", dias: 10, mensaje: (n: string) => `Hola ${n}, una pregunta: ¿conoces a alguien que esté pensando en cambiar de auto? Si me pasas su contacto, le doy la misma atención que a ti 🙌` },
  { id: "pv_servicio", label: "Recordar primer servicio", dias: 170, mensaje: (n: string) => `Hola ${n}, ya se acerca el primer servicio de tu BYD (6 meses). ¿Te ayudo a agendarlo?` },
] as const;
export type PasoPostventa = (typeof POSTVENTA)[number]["id"];
export const esPasoPostventa = (id: string): id is PasoPostventa => POSTVENTA.some((p) => p.id === id);

export type EstadoPostventa = { id: string; label: string; fecha: string; hecho: string | null; vencido: boolean; mensaje: string };
export function postventa(fechaEntrega: string, expediente: Record<string, string>, cliente: string, agencia: string, hoy: string): EstadoPostventa[] {
  return POSTVENTA.map((p) => {
    const fecha = sumarDias(fechaEntrega, p.dias);
    const hecho = expediente[p.id] ?? null;
    return { id: p.id, label: p.label, fecha, hecho, vencido: !hecho && fecha <= hoy, mensaje: p.mensaje(primerNombre(cliente), agencia) };
  });
}

// ---------------------------------------------------------------------
// Alertas de cada expediente
// ---------------------------------------------------------------------

export type Alerta = { tipo: "entrega" | "detenido" | "recibo" | "adeudo" | "postventa"; texto: string; grave: boolean };

export type VentaAlertas = {
  estatus: string; forma_pago: string; fecha_entrega: string | null; updated_at?: string | null;
  documentos: { created_at: string; movimiento_id: string | null }[];
  movimientos: { id: string; tipo: string; concepto: string; fecha: string }[];
};

const diasEntre = (a: string, b: string) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86_400_000);

/** Última vez que se movió algo del expediente (venta, archivo o pago), en YYYY-MM-DD. */
export function ultimaActividad(v: VentaAlertas): string | null {
  const fechas = [v.updated_at?.slice(0, 10), ...v.documentos.map((d) => d.created_at.slice(0, 10)), ...v.movimientos.map((m) => m.fecha)].filter((x): x is string => !!x);
  return fechas.length ? fechas.sort().at(-1)! : null;
}

export function alertasVenta(v: VentaAlertas, p: ResultadoProceso, hoy: string): Alerta[] {
  if (v.estatus === "cancelada" || v.estatus === "entregada") return [];
  const out: Alerta[] = [];
  const faltan = p.pendientes.filter((x) => x.id !== "entrega").length;
  if (v.fecha_entrega) {
    const d = diasEntre(hoy, v.fecha_entrega);
    if (d <= 7) {
      const cuando = d < 0 ? `era el ${v.fecha_entrega.slice(8)}/${v.fecha_entrega.slice(5, 7)} (atrasada)` : d === 0 ? "es hoy" : d === 1 ? "es mañana" : `en ${d} días`;
      out.push({ tipo: "entrega", texto: `Entrega ${cuando}${faltan ? ` · faltan ${faltan} pendientes` : " · todo listo"}`, grave: faltan > 0 && d <= 2 });
    }
  }
  const ult = ultimaActividad(v);
  if (ult && diasEntre(ult, hoy) >= 5) out.push({ tipo: "detenido", texto: `Sin movimiento desde hace ${diasEntre(ult, hoy)} días`, grave: diasEntre(ult, hoy) >= 10 });
  const conRecibo = new Set(v.documentos.map((d) => d.movimiento_id).filter(Boolean));
  const sinRecibo = v.movimientos.filter((m) => m.tipo === "pago" && (ORIGENES_CON_RECIBO as string[]).includes(m.concepto) && !conRecibo.has(m.id)).length;
  if (sinRecibo) out.push({ tipo: "recibo", texto: sinRecibo === 1 ? "1 pago sin recibo" : `${sinRecibo} pagos sin recibo`, grave: false });
  const desembolsoListo = v.forma_pago === "Contado" || v.movimientos.some((m) => m.tipo === "pago" && m.concepto === "desembolso");
  if (p.cuenta.completo && !p.cuenta.sinAdeudo && desembolsoListo) out.push({ tipo: "adeudo", texto: `Debe ${dinero2(-p.cuenta.saldo)}`, grave: true });
  return out;
}

// ---------------------------------------------------------------------
// Comisiones
// ---------------------------------------------------------------------

export type ComisionProducto = { fijo?: number | null; pct?: number | null };
export type EsquemaComision = {
  /** Monto fijo por unidad vendida. */
  por_unidad?: number | null;
  /** % sobre el valor factura (ej. 0.5 = 0.5%). */
  pct_factura?: number | null;
  /** Por clave de producto (garantia, cerocible…): monto fijo y/o % de su precio. */
  productos?: Record<string, ComisionProducto>;
  /** Bono si el asesor llega a su meta de unidades del mes. */
  bono_meta?: number | null;
  /** Meta de ingreso del mes por usuario. */
  metas?: Record<string, number>;
};

export type VentaComision = {
  estatus: string; valor_factura: number | null; productos: string[];
  movimientos: { tipo: string; concepto: string; monto: number }[];
};

const n = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const redondo = (v: number) => Math.round(v * 100) / 100;

/** Comisión de una venta: unidad + % factura + cada producto vendido (precio = su cargo en la cuenta o el de catálogo). */
export function comisionVenta(esq: EsquemaComision, v: VentaComision, catalogo: { id: string; clave: string; nombre: string; precio: number | null }[]) {
  if (v.estatus === "cancelada") return { unidad: 0, productos: [] as { nombre: string; monto: number }[], total: 0 };
  const unidad = redondo(n(esq.por_unidad) + n(v.valor_factura) * n(esq.pct_factura) / 100);
  const productos = catalogo.filter((p) => v.productos.includes(p.id)).map((p) => {
    const regla = esq.productos?.[p.clave] ?? {};
    const concepto = CARGO_DE_PRODUCTO[p.clave];
    const cargo = concepto ? v.movimientos.filter((m) => m.tipo === "cargo" && m.concepto === concepto).reduce((t, m) => t + n(m.monto), 0) : 0;
    const precio = cargo || n(p.precio);
    return { nombre: p.nombre, monto: redondo(n(regla.fijo) + precio * n(regla.pct) / 100) };
  }).filter((x) => x.monto > 0);
  return { unidad, productos, total: redondo(unidad + productos.reduce((t, x) => t + x.monto, 0)) };
}

export const esquemaVacio = (e: EsquemaComision | undefined) =>
  !e || (!n(e.por_unidad) && !n(e.pct_factura) && !Object.values(e.productos ?? {}).some((x) => n(x.fijo) || n(x.pct)));

/** Cómo mostrar el saldo: en crédito, mientras no llega el desembolso, lo que falta es del banco. */
export function textoSaldo(formaPago: string, c: { completo: boolean; sinAdeudo: boolean; saldo: number; porOrigen: { origen: string }[] }): { texto: string; tono: "ok" | "bad" | "warn" | "neutro" } {
  if (!c.completo) return { texto: "Sin valor factura", tono: "neutro" };
  if (c.sinAdeudo) return { texto: "Sin adeudo", tono: "ok" };
  if (formaPago !== "Contado" && !c.porOrigen.some((o) => o.origen === "desembolso")) return { texto: "Espera desembolso", tono: "warn" };
  return { texto: `Debe ${dinero2(-c.saldo).replace(/\.00$/, "")}`, tono: "bad" };
}

// ---------------------------------------------------------------------
// Lista de lo urgente (Inicio y correo diario)
// ---------------------------------------------------------------------

export type Urgente = Alerta & { ventaId: string; cliente: string; vendedor: string };
const ORDEN_ALERTA: Record<Alerta["tipo"], number> = { entrega: 0, adeudo: 1, detenido: 2, recibo: 3, postventa: 4 };

/** Alertas de los expedientes abiertos + postventa vencida de los entregados, lo grave primero. */
export function pendientesUrgentes<V extends VentaAlertas & { id: string; cliente: string; vendedor_id: string; expediente: Record<string, string> }>(
  enProceso: V[], entregadas: V[], proceso: (v: V) => ResultadoProceso, agencia: string, hoy: string,
): Urgente[] {
  const out: Urgente[] = [];
  for (const v of enProceso) for (const a of alertasVenta(v, proceso(v), hoy)) out.push({ ...a, ventaId: v.id, cliente: v.cliente, vendedor: v.vendedor_id });
  for (const v of entregadas) {
    if (v.estatus !== "entregada" || !v.fecha_entrega) continue;
    const toca = postventa(v.fecha_entrega, v.expediente, v.cliente, agencia, hoy).filter((x) => x.vencido);
    if (toca.length) out.push({ tipo: "postventa", texto: `Postventa: ${toca.map((x) => x.label.toLowerCase()).join(", ")}`, grave: false, ventaId: v.id, cliente: v.cliente, vendedor: v.vendedor_id });
  }
  return out.sort((a, b) => Number(b.grave) - Number(a.grave) || ORDEN_ALERTA[a.tipo] - ORDEN_ALERTA[b.tipo]);
}
