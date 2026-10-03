import "server-only";
import { rangoMes } from "@/lib/dominio/fechas";
import type { Sesion } from "@/lib/sesion";
import type { Corte, FilaRanking, Metas, Modelo, Perfil, Producto, ProgresoAcademia, Prospecto, Venta } from "@/lib/tipos";

/**
 * Lecturas de la base. Usan el cliente con la sesión del usuario, así que cada quien recibe
 * solo lo que sus permisos le dejan ver. Las que también usa el dashboard público (sin sesión,
 * con el cliente de servicio) filtran además por agencia.
 */

const COLS_VENTA = "id, folio, fecha, vendedor_id, cliente, num_cliente, telefono, vin, modelo_id, color, color_nombre, forma_pago, plaza, estatus, fecha_entrega, valor_factura, notas, expediente, credito, origen, created_at, updated_at, venta_productos(producto_id), venta_documentos(id, tipo, movimiento_id, nombre, enlace, mime, tamano, created_at), venta_movimientos(id, tipo, concepto, aplica_a, monto, fecha, forma, referencia, notas)";
type FilaVenta = Omit<Venta, "productos" | "documentos" | "movimientos"> & {
  venta_productos: { producto_id: string }[] | null;
  venta_documentos: Venta["documentos"] | null;
  venta_movimientos: Venta["movimientos"] | null;
};
const aVenta = (f: FilaVenta): Venta => {
  const { venta_productos, venta_documentos, venta_movimientos, ...resto } = f;
  return {
    ...resto,
    valor_factura: resto.valor_factura == null ? null : Number(resto.valor_factura),
    expediente: resto.expediente ?? {},
    credito: resto.credito ?? {},
    productos: (venta_productos ?? []).map((p) => p.producto_id),
    documentos: (venta_documentos ?? []).map((d) => ({ ...d, tamano: d.tamano == null ? null : Number(d.tamano) })).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    movimientos: (venta_movimientos ?? []).map((m) => ({ ...m, monto: Number(m.monto) })).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id)),
  };
};

function revisar<T>(r: { data: T | null; error: { message: string } | null }, que: string): T {
  if (r.error) throw new Error(`No se pudo leer ${que}: ${r.error.message}`);
  return r.data as T;
}

export async function equipo(s: Sesion): Promise<Perfil[]> {
  const r = await s.sb.from("perfiles").select("id, agencia_id, usuario, nombre, nombre_corto, rol, vende, activo, telefono").eq("agencia_id", s.agencia.id).order("rol").order("nombre");
  const orden = { ceo: 0, gerente: 1, asesor: 2 } as const;
  return revisar<Perfil[]>(r, "el equipo").sort((a, b) => orden[a.rol] - orden[b.rol] || a.nombre.localeCompare(b.nombre));
}

export async function catalogo(s: Sesion, incluirInactivos = false) {
  let qm = s.sb.from("modelos").select("id, clave, nombre, anio, motor, precio, bono, descripcion, activo, orden, banorte_submarca, banorte_anio, banorte_modelo").eq("agencia_id", s.agencia.id).order("orden").order("nombre");
  let qp = s.sb.from("productos").select("id, clave, nombre, nombre_corto, precio, activo, orden").eq("agencia_id", s.agencia.id).order("orden");
  if (!incluirInactivos) { qm = qm.eq("activo", true); qp = qp.eq("activo", true); }
  const [m, p] = await Promise.all([qm, qp]);
  const modelos = revisar<Modelo[]>(m, "los modelos").map((x) => ({ ...x, precio: Number(x.precio), bono: Number(x.bono) }));
  const productos = revisar<Producto[]>(p, "los productos").map((x) => ({ ...x, precio: x.precio == null ? null : Number(x.precio) }));
  return { modelos, productos };
}

export async function ventasDelMes(s: Sesion, mes: string, vendedor?: string | null): Promise<Venta[]> {
  const { desde, hasta } = rangoMes(mes);
  let q = s.sb.from("ventas").select(COLS_VENTA).eq("agencia_id", s.agencia.id).gte("fecha", desde).lt("fecha", hasta).order("fecha", { ascending: false }).order("folio", { ascending: false });
  if (vendedor) q = q.eq("vendedor_id", vendedor);
  return revisar<FilaVenta[]>(await q, "las ventas").map(aVenta);
}

export async function ventasRecientes(s: Sesion, limite = 6): Promise<Venta[]> {
  const r = await s.sb.from("ventas").select(COLS_VENTA).order("created_at", { ascending: false }).limit(limite);
  return revisar<FilaVenta[]>(r, "las ventas").map(aVenta);
}

export async function venta(s: Sesion, id: string): Promise<Venta | null> {
  const r = await s.sb.from("ventas").select(COLS_VENTA).eq("id", id).maybeSingle<FilaVenta>();
  const f = revisar<FilaVenta | null>(r, "la venta");
  return f ? aVenta(f) : null;
}

export async function ventasEnProceso(s: Sesion): Promise<Venta[]> {
  const r = await s.sb.from("ventas").select(COLS_VENTA).eq("agencia_id", s.agencia.id).in("estatus", ["apartada", "facturada"]).order("fecha", { ascending: true }).limit(200);
  return revisar<FilaVenta[]>(r, "las ventas").map(aVenta);
}

export type CambioVenta = { id: number; tabla: string; accion: string; usuario_id: string | null; datos: Record<string, unknown>; created_at: string };
/** Cambios de la venta y de su expediente (pagos, cargos y archivos), del más reciente al más viejo. */
/** Ventas con entrega programada o hecha desde `desde` (para el calendario y la postventa). */
export async function ventasConEntrega(s: Sesion, desde: string, hasta?: string): Promise<Venta[]> {
  let q = s.sb.from("ventas").select(COLS_VENTA).eq("agencia_id", s.agencia.id).neq("estatus", "cancelada").gte("fecha_entrega", desde).order("fecha_entrega").limit(300);
  if (hasta) q = q.lte("fecha_entrega", hasta);
  return revisar<FilaVenta[]>(await q, "las entregas").map(aVenta);
}

export async function historialVenta(s: Sesion, id: string): Promise<CambioVenta[]> {
  const cols = "id, tabla, accion, usuario_id, datos, created_at";
  const [a, b] = await Promise.all([
    s.sb.from("bitacora").select(cols).eq("tabla", "ventas").eq("registro_id", id).order("created_at", { ascending: false }).limit(30),
    s.sb.from("bitacora").select(cols).in("tabla", ["venta_movimientos", "venta_documentos"]).eq("datos->>venta_id", id).order("created_at", { ascending: false }).limit(60),
  ]);
  return [...revisar<CambioVenta[]>(a, "el historial"), ...revisar<CambioVenta[]>(b, "el historial")]
    .sort((x, y) => y.created_at.localeCompare(x.created_at)).slice(0, 60);
}

export async function metasDelMes(s: Sesion, mes: string): Promise<Metas> {
  const { desde } = rangoMes(mes);
  const [u, p] = await Promise.all([
    s.sb.from("metas").select("vendedor_id, unidades").eq("agencia_id", s.agencia.id).eq("mes", desde),
    s.sb.from("metas_producto").select("producto_id, porcentaje").eq("agencia_id", s.agencia.id).eq("mes", desde),
  ]);
  const filasU = revisar<{ vendedor_id: string; unidades: number }[]>(u, "las metas");
  const filasP = revisar<{ producto_id: string; porcentaje: number }[]>(p, "las metas por producto");
  return {
    mes,
    unidades: Object.fromEntries(filasU.map((f) => [f.vendedor_id, f.unidades])),
    productos: Object.fromEntries(filasP.map((f) => [f.producto_id, f.porcentaje])),
    guardadas: filasU.length > 0 || filasP.length > 0,
  };
}

/** Meta efectiva: la guardada o la inicial de la agencia. */
export function metaUnidades(s: Sesion, metas: Metas, vendedorId: string) {
  return metas.unidades[vendedorId] ?? s.agencia.parametros.meta_unidades ?? 14;
}
export function metaProducto(s: Sesion, metas: Metas, productoId: string) {
  return metas.productos[productoId] ?? s.agencia.parametros.meta_producto ?? 50;
}

export async function ranking(s: Sesion, mes: string): Promise<FilaRanking[]> {
  const r = await s.sb.rpc("ranking_mes", { p_mes: rangoMes(mes).desde });
  return revisar<FilaRanking[]>(r, "el ranking");
}

export async function prospectos(s: Sesion, asesor?: string | null): Promise<Prospecto[]> {
  let q = s.sb.from("prospectos").select("id, asesor_id, nombre, telefono, modelo_id, etapa, origen, calor, siguiente_accion, fecha_siguiente, enganche, toma_a_cuenta, notas, venta_id, created_at, updated_at").order("fecha_siguiente", { ascending: true, nullsFirst: false }).limit(500);
  if (asesor) q = q.eq("asesor_id", asesor);
  return revisar<Prospecto[]>(await q, "los prospectos").map((p) => ({ ...p, enganche: p.enganche == null ? null : Number(p.enganche) }));
}

export async function seguimientosPendientes(s: Sesion, hasta: string, asesor: string): Promise<Prospecto[]> {
  const r = await s.sb.from("prospectos").select("id, asesor_id, nombre, telefono, modelo_id, etapa, origen, calor, siguiente_accion, fecha_siguiente, enganche, toma_a_cuenta, notas, venta_id, created_at, updated_at")
    .eq("asesor_id", asesor).lte("fecha_siguiente", hasta).not("etapa", "in", "(entregado,referidor,perdido)").order("fecha_siguiente").limit(8);
  return revisar<Prospecto[]>(r, "los seguimientos");
}

export async function cortesDelDia(s: Sesion, fecha: string): Promise<Corte[]> {
  const r = await s.sb.from("cortes").select("fecha, usuario_id, valores, updated_at").eq("fecha", fecha);
  return revisar<Corte[]>(r, "los cortes");
}

export async function progresoAcademia(s: Sesion): Promise<ProgresoAcademia[]> {
  const r = await s.sb.from("academia_progreso").select("usuario_id, respuestas, examen, examen_terminado");
  return revisar<ProgresoAcademia[]>(r, "la academia");
}

export async function vinesUsados(s: Sesion) {
  const r = await s.sb.from("ventas").select("id, vin, cliente").not("vin", "is", null).neq("estatus", "cancelada").limit(5000);
  return revisar<{ id: string; vin: string; cliente: string }[]>(r, "los VIN");
}

/** Todo lo que necesita el formulario de venta. */
export async function contextoVenta(s: Sesion) {
  const [cat, eq, vins] = await Promise.all([catalogo(s, true), equipo(s), vinesUsados(s)]);
  return {
    yo: { id: s.perfil.id, nombre: s.perfil.nombre, vende: s.perfil.vende },
    direccion: s.direccion,
    vendedores: eq.filter((p) => p.vende && p.activo).map((p) => ({ id: p.id, nombre: p.nombre, rol: p.rol })),
    modelos: cat.modelos.map((m) => ({ id: m.id, nombre: m.nombre, anio: m.anio, activo: m.activo })),
    productos: cat.productos.filter((p) => p.activo).map((p) => ({ id: p.id, nombre: p.nombre })),
    vinesUsados: vins,
    catalogo: cat,
    equipo: eq,
  };
}
