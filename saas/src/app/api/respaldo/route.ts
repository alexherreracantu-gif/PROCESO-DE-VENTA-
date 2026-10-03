import { strToU8, zipSync } from "fflate";
import { obtenerSesion } from "@/lib/sesion";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { aCsv } from "@/lib/dominio/csv";
import { labelCargo, labelOrigen } from "@/lib/dominio/cuenta";
import { requisito } from "@/lib/dominio/proceso";
import { hoy } from "@/lib/dominio/fechas";

/**
 * Respaldo en ZIP con todo lo que el usuario puede ver (dirección: toda la agencia; asesor: lo suyo):
 * ventas, cuenta de cada cliente, lista de documentos, prospectos e inversión en publicidad.
 * Los archivos del expediente se bajan aparte con "Descargar ZIP" en cada venta.
 */
export async function GET() {
  const s = await obtenerSesion();
  if (!s) return new Response("Tu sesión terminó. Vuelve a entrar al portal.", { status: 401 });
  const [ventas, movs, docs, pros, inv, modelos, eq] = await Promise.all([
    s.sb.from("ventas").select("id, folio, fecha, vendedor_id, cliente, num_cliente, telefono, vin, modelo_id, color, color_nombre, forma_pago, plaza, estatus, fecha_entrega, valor_factura, origen, notas, credito").order("fecha"),
    s.sb.from("venta_movimientos").select("venta_id, tipo, concepto, aplica_a, monto, fecha, forma, referencia, notas").order("fecha"),
    s.sb.from("venta_documentos").select("venta_id, tipo, nombre, enlace, ruta, created_at").order("created_at"),
    s.sb.from("prospectos").select("asesor_id, nombre, telefono, modelo_id, etapa, origen, calor, siguiente_accion, fecha_siguiente, notas, created_at").order("created_at"),
    s.sb.from("inversion_publicidad").select("usuario_id, mes, canal, monto").order("mes"),
    s.sb.from("modelos").select("id, nombre, anio"),
    s.sb.from("perfiles").select("id, nombre"),
  ]);
  const error = [ventas, movs, docs, pros, inv, modelos, eq].find((r) => r.error)?.error;
  if (error) return new Response("No se pudo armar el respaldo: " + error.message, { status: 500 });

  const modelo = new Map((modelos.data ?? []).map((m) => [m.id, `${m.nombre} ${m.anio}`]));
  const persona = new Map((eq.data ?? []).map((p) => [p.id, p.nombre]));
  const folio = new Map((ventas.data ?? []).map((v) => [v.id, `#${v.folio} ${v.cliente}`]));

  const archivos = {
    "ventas.csv": aCsv([
      ["Folio", "Fecha", "Vendedor", "Cliente", "Número de cliente", "Teléfono", "VIN", "Modelo", "Color", "Forma de pago", "Plaza", "Estatus", "Entrega", "Valor factura", "Origen", "Banco", "Monto financiado", "Plazo", "Tasa", "Notas"],
      ...(ventas.data ?? []).map((v) => [v.folio, v.fecha, persona.get(v.vendedor_id), v.cliente, v.num_cliente, v.telefono, v.vin, modelo.get(v.modelo_id), [v.color, v.color_nombre].filter(Boolean).join(" · "),
        v.forma_pago, v.plaza, v.estatus, v.fecha_entrega, v.valor_factura, v.origen, v.credito?.banco, v.credito?.monto, v.credito?.plazo, v.credito?.tasa, v.notas]),
    ]),
    "cuenta de clientes.csv": aCsv([
      ["Venta", "Fecha", "Tipo", "Concepto", "Aplicado a", "Forma de pago", "Referencia", "Monto", "Nota"],
      ...(movs.data ?? []).map((m) => [folio.get(m.venta_id), m.fecha, m.tipo === "cargo" ? "Cargo" : "Pago", m.tipo === "cargo" ? labelCargo(m.concepto) : labelOrigen(m.concepto),
        m.tipo === "pago" ? labelCargo(m.aplica_a) : "", m.forma, m.referencia, m.monto, m.notas]),
    ]),
    "documentos.csv": aCsv([
      ["Venta", "Documento", "Archivo", "Dónde está", "Subido"],
      ...(docs.data ?? []).map((d) => [folio.get(d.venta_id), d.tipo === "recibo" ? "Recibo de pago" : requisito(d.tipo)?.label ?? d.tipo, d.nombre, d.enlace ?? "Portal (Storage)", d.created_at.slice(0, 10)]),
    ]),
    "prospectos.csv": aCsv([
      ["Asesor", "Nombre", "Teléfono", "Modelo", "Etapa", "Origen", "Calor", "Siguiente acción", "Fecha siguiente", "Notas", "Alta"],
      ...(pros.data ?? []).map((p) => [persona.get(p.asesor_id), p.nombre, p.telefono, p.modelo_id ? modelo.get(p.modelo_id) : "", p.etapa, p.origen, p.calor, p.siguiente_accion, p.fecha_siguiente, p.notas, p.created_at.slice(0, 10)]),
    ]),
    "inversion en publicidad.csv": aCsv([["Quién", "Mes", "Canal", "Monto"], ...(inv.data ?? []).map((x) => [persona.get(x.usuario_id), x.mes.slice(0, 7), x.canal, x.monto])]),
  };
  const zip = zipSync(Object.fromEntries(Object.entries(archivos).map(([k, v]) => [k, strToU8(v)])));

  if (s.direccion) {
    // Para el recordatorio semanal del Inicio.
    const admin = supabaseAdmin();
    const { data } = await admin.from("agencias").select("parametros").eq("id", s.agencia.id).single<{ parametros: Record<string, unknown> }>();
    await admin.from("agencias").update({ parametros: { ...(data?.parametros ?? {}), ultimo_respaldo: hoy() } }).eq("id", s.agencia.id);
  }
  const nombre = `Respaldo Park Point ${hoy()}${s.direccion ? "" : ` ${s.perfil.nombre_corto}`}.zip`;
  return new Response(zip as Uint8Array<ArrayBuffer>, {
    headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${encodeURIComponent(nombre)}"; filename*=UTF-8''${encodeURIComponent(nombre)}`, "Cache-Control": "no-store" },
  });
}
