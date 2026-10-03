/**
 * Proceso de la venta, de la aprobación del crédito a la hoja de salida, con cada documento
 * que debe quedar en el expediente. Se arma igual que las carpetas de los clientes:
 * crédito → separación y pedido → factura → pagos y cuadre → placas → hoja de salida.
 *
 * Estado de cada requisito:
 *  · documento: hecho si tiene archivo/enlace o se marcó "en físico" (expediente[id] = fecha).
 *  · paso: hecho si se marcó (expediente[id] = fecha).
 *  · automático: lo calcula el portal (cuadre, recibos, cargos).
 *  · "No aplica": expediente[id] = "na".
 */
import { calcularCuenta, CARGO_DE_PRODUCTO, ORIGENES_CON_RECIBO, type DatosCredito, type Movimiento, type ResultadoCuenta } from "./cuenta";
import { dinero2 } from "./formato";

export type ContextoProceso = { credito: boolean; frontera: boolean };
export type TipoRequisito = "doc" | "paso" | "auto";
export type Requisito = {
  id: string; label: string; ayuda: string; tipo: TipoRequisito;
  aplica?: (c: ContextoProceso) => boolean;
  /** Documentos que suelen ser varios archivos (estados de cuenta, aplicaciones de pago…). */
  varios?: boolean;
};
export type EtapaProceso = { id: string; label: string; labelContado?: string; requisitos: Requisito[] };

const credito = (c: ContextoProceso) => c.credito;
const frontera = (c: ContextoProceso) => c.frontera;

export const ETAPAS_PROCESO: EtapaProceso[] = [
  {
    id: "credito", label: "Crédito y documentos del cliente", labelContado: "Documentos del cliente",
    requisitos: [
      { id: "ine", label: "INE", ayuda: "Por ambos lados, vigente.", tipo: "doc" },
      { id: "curp", label: "CURP", ayuda: "Impresa del portal del gobierno.", tipo: "doc" },
      { id: "domicilio", label: "Comprobante de domicilio", ayuda: "No mayor a 3 meses.", tipo: "doc" },
      { id: "ingresos", label: "Estados de cuenta / ingresos", ayuda: "Los últimos 3 meses.", tipo: "doc", aplica: credito, varios: true },
      { id: "solicitud", label: "Solicitud de crédito firmada", ayuda: "La del banco, llena y firmada.", tipo: "doc", aplica: credito },
      { id: "buro", label: "Autorización de Buró", ayuda: "Firmada por el cliente.", tipo: "doc", aplica: credito },
      { id: "aprobacion", label: "Carta de aprobación del crédito", ayuda: "Captura banco, monto, enganche, plazo y tasa. No pidas la separación antes.", tipo: "doc", aplica: credito },
    ],
  },
  {
    id: "apartado", label: "Separación y pedido",
    requisitos: [
      { id: "separacion", label: "Recibo de separación", ayuda: "$5,000 en caja, al concepto Accesorios. Si lo subes en el pago de la cuenta, cuenta aquí.", tipo: "doc" },
      { id: "rfc", label: "Constancia de situación fiscal (RFC)", ayuda: "Para facturar con los datos correctos.", tipo: "doc" },
      { id: "quiter", label: "Alta del cliente en Quiter", ayuda: "Comercial → Fichas maestras → Cuentas personales. Anota el número de cliente.", tipo: "paso" },
      { id: "bono_carta", label: "Carta bono flexible", ayuda: "Firmada, si el cliente lleva bono.", tipo: "doc", aplica: credito },
      { id: "prefactura", label: "Prefactura", ayuda: "Revisa nombre, RFC, versión y color.", tipo: "doc" },
      { id: "pedido", label: "Confirmación de prefactura / pedido", ayuda: "Con el número de pedido.", tipo: "doc" },
    ],
  },
  {
    id: "factura", label: "Facturación",
    requisitos: [
      { id: "factura", label: "Factura", ayuda: "PDF (y XML si lo tienes).", tipo: "doc", varios: true },
      { id: "carta_factura", label: "Carta factura", ayuda: "La pide el banco y sirve para placas.", tipo: "doc", aplica: credito },
      { id: "nota_credito", label: "Nota de crédito del bono", ayuda: "La bonificación aplicada a la factura.", tipo: "doc", aplica: credito },
    ],
  },
  {
    id: "pagos", label: "Pagos y cuadre",
    requisitos: [
      { id: "cargos", label: "Cargos completos", ayuda: "Factura y cada producto vendido con su precio en la cuenta.", tipo: "auto" },
      { id: "aplicacion", label: "Aplicaciones de pago", ayuda: "La hoja de caja de cada pago aplicado.", tipo: "doc", varios: true },
      { id: "recibos", label: "Recibo de caja de cada pago", ayuda: "Súbelo en cada pago de la cuenta.", tipo: "auto" },
      { id: "desembolso", label: "Comprobante de desembolso", ayuda: "Compara lo que depositó el banco contra lo aprobado.", tipo: "doc", aplica: credito },
      { id: "cuadre", label: "Cuadre sin adeudo", ayuda: "Si falta aunque sea $1, el carro no sale.", tipo: "auto" },
    ],
  },
  {
    id: "placas", label: "Placas y permisos",
    requisitos: [
      { id: "licencia", label: "Licencia de conducir", ayuda: "Del titular.", tipo: "doc" },
      { id: "registro", label: "Solicitud de registro estatal vehicular", ayuda: "Llena y firmada.", tipo: "doc" },
      { id: "placas_pago", label: "Pago de placas", ayuda: "Comprobante del pago al estado.", tipo: "doc" },
      { id: "gestoria", label: "Pago de gestoría", ayuda: "Recibo de la gestoría.", tipo: "doc" },
      { id: "extracto", label: "Extracto firmado", ayuda: "Firmado por el cliente.", tipo: "doc" },
      { id: "permiso", label: "Permiso de frontera", ayuda: "Ventas de Piedras Negras.", tipo: "doc", aplica: frontera },
      { id: "permiso_pago", label: "Pago del permiso", ayuda: "Comprobante del pago del permiso.", tipo: "doc", aplica: frontera },
    ],
  },
  {
    id: "salida", label: "Hoja de salida y entrega",
    requisitos: [
      { id: "instalacion", label: "Productos instalados y unidad lista", ayuda: "Accesorios, llanta, polarizado, carga y lavado.", tipo: "paso" },
      { id: "salida", label: "Hoja de salida firmada", ayuda: "Imprime la hoja de control y anéxala con la de la agencia.", tipo: "doc" },
      { id: "entrega", label: "Unidad entregada", ayuda: "Reseña, video y referidos. Cambia la venta a Entregada.", tipo: "paso" },
    ],
  },
];

export const TODOS_REQUISITOS = ETAPAS_PROCESO.flatMap((e) => e.requisitos);
export const requisito = (id: string) => TODOS_REQUISITOS.find((r) => r.id === id);
/** Tipos de documento válidos: los de cada requisito con archivo + "recibo" de un pago. */
export const TIPOS_DOCUMENTO = [...TODOS_REQUISITOS.filter((r) => r.tipo === "doc").map((r) => r.id), "recibo"];
export const NO_APLICA = "na";
/** Requisito que se cumple con el recibo de un pago de ese origen. */
export const REQUISITO_DE_ORIGEN: Record<string, string> = { separacion: "separacion", desembolso: "desembolso", bono: "nota_credito" };

export type DocumentoResumen = { id: string; tipo: string; movimiento_id: string | null; nombre: string; enlace: string | null; mime: string | null; tamano: number | null; created_at: string };

export type EntradaProceso = {
  forma_pago: string;
  plaza: string;
  valor_factura: number | null;
  expediente: Record<string, string>;
  documentos: Pick<DocumentoResumen, "tipo" | "movimiento_id">[];
  movimientos: Movimiento[];
  credito?: DatosCredito;
  /** Claves de los productos vendidos (garantia, accesorios…). */
  productosVendidos?: string[];
};

export type EstadoRequisito = "hecho" | "pendiente" | "na";
export type RequisitoEvaluado = Omit<Requisito, "aplica"> & { estado: EstadoRequisito; detalle: string | null; archivos: number; fecha: string | null; marcado: boolean };
export type EtapaEvaluada = { id: string; label: string; requisitos: RequisitoEvaluado[]; hechos: number; total: number; completa: boolean };
export type ResultadoProceso = {
  etapas: EtapaEvaluada[];
  hechos: number;
  total: number;
  pct: number;
  siguiente: RequisitoEvaluado | null;
  pendientes: RequisitoEvaluado[];
  /** Todo listo para entregar (sin contar el paso "Unidad entregada"). */
  listoParaSalida: boolean;
  cuenta: ResultadoCuenta;
};

const esFecha = (v: string | undefined) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function contextoProceso(formaPago: string, plaza: string): ContextoProceso {
  return { credito: formaPago !== "Contado", frontera: plaza === "Piedras Negras" };
}

export function evaluarProceso(e: EntradaProceso): ResultadoProceso {
  const ctx = contextoProceso(e.forma_pago, e.plaza);
  const cuenta = calcularCuenta(e.valor_factura, e.movimientos, e.credito);
  const archivos = new Map<string, number>();
  for (const d of e.documentos) archivos.set(d.tipo, (archivos.get(d.tipo) ?? 0) + 1);
  // El recibo subido en un pago también cuenta para su documento (separación, desembolso, nota de crédito).
  const origenDe = new Map(e.movimientos.filter((m) => m.tipo === "pago").map((m) => [m.id, m.concepto]));
  for (const d of e.documentos) {
    const req = d.movimiento_id ? REQUISITO_DE_ORIGEN[origenDe.get(d.movimiento_id) ?? ""] : undefined;
    if (req) archivos.set(req, (archivos.get(req) ?? 0) + 1);
  }

  // Recibo de cada pago (los bonos van con su nota de crédito).
  const pagosConRecibo = e.movimientos.filter((m) => m.tipo === "pago" && (ORIGENES_CON_RECIBO as string[]).includes(m.concepto));
  const conRecibo = new Set(e.documentos.filter((d) => d.movimiento_id).map((d) => d.movimiento_id));
  const recibosHechos = pagosConRecibo.filter((m) => conRecibo.has(m.id)).length;

  // Cargos: valor factura + un cargo por cada producto vendido.
  const cargosCapturados = new Set(e.movimientos.filter((m) => m.tipo === "cargo").map((m) => m.concepto));
  const faltanCargos = [...new Set((e.productosVendidos ?? []).map((p) => CARGO_DE_PRODUCTO[p]).filter(Boolean))].filter((c) => !cargosCapturados.has(c));

  const auto = (id: string): { hecho: boolean; detalle: string | null } => {
    if (id === "cuadre") {
      if (!cuenta.completo) return { hecho: false, detalle: "Falta el valor factura." };
      return cuenta.sinAdeudo
        ? { hecho: true, detalle: cuenta.saldo > 0 ? `Sin adeudo · saldo a favor ${dinero2(cuenta.saldo)}` : "Sin adeudo" }
        : { hecho: false, detalle: `Falta cubrir ${dinero2(-cuenta.saldo)}` };
    }
    if (id === "recibos") {
      if (!pagosConRecibo.length) return { hecho: false, detalle: "Aún no hay pagos registrados." };
      return { hecho: recibosHechos === pagosConRecibo.length, detalle: `${recibosHechos} de ${pagosConRecibo.length} pagos con recibo` };
    }
    if (id === "cargos") {
      if (!cuenta.completo) return { hecho: false, detalle: "Falta el valor factura." };
      return faltanCargos.length
        ? { hecho: false, detalle: `Falta el cargo de ${faltanCargos.length === 1 ? "1 producto vendido" : `${faltanCargos.length} productos vendidos`}` }
        : { hecho: true, detalle: `Total ${dinero2(cuenta.totalCargos)}` };
    }
    return { hecho: false, detalle: null };
  };

  const etapas: EtapaEvaluada[] = ETAPAS_PROCESO.map((et) => {
    const requisitos = et.requisitos.filter((r) => !r.aplica || r.aplica(ctx)).map((r): RequisitoEvaluado => {
      const marca = e.expediente[r.id];
      const n = archivos.get(r.id) ?? 0;
      // Sin la función `aplica`, para poder mandarlo a componentes de cliente.
      const base = { id: r.id, label: r.label, ayuda: r.ayuda, tipo: r.tipo, varios: r.varios, archivos: n, fecha: esFecha(marca) ? marca : null, marcado: esFecha(marca) };
      if (marca === NO_APLICA && r.tipo !== "auto") return { ...base, estado: "na", detalle: "No aplica" };
      if (r.tipo === "auto") {
        const a = auto(r.id);
        return { ...base, estado: a.hecho ? "hecho" : "pendiente", detalle: a.detalle, fecha: null, marcado: false };
      }
      if (r.tipo === "doc") {
        if (n > 0) return { ...base, estado: "hecho", detalle: n === 1 ? "1 archivo" : `${n} archivos` };
        if (base.marcado) return { ...base, estado: "hecho", detalle: "Entregado en físico" };
        return { ...base, estado: "pendiente", detalle: null };
      }
      return { ...base, estado: base.marcado ? "hecho" : "pendiente", detalle: null };
    });
    const cuentan = requisitos.filter((r) => r.estado !== "na");
    const hechos = cuentan.filter((r) => r.estado === "hecho").length;
    return {
      id: et.id, label: !ctx.credito && et.labelContado ? et.labelContado : et.label,
      requisitos, hechos, total: cuentan.length, completa: hechos === cuentan.length,
    };
  });

  const todos = etapas.flatMap((x) => x.requisitos).filter((r) => r.estado !== "na");
  const pendientes = todos.filter((r) => r.estado === "pendiente");
  const hechos = todos.length - pendientes.length;
  return {
    etapas,
    hechos,
    total: todos.length,
    pct: todos.length ? hechos / todos.length : 0,
    siguiente: pendientes[0] ?? null,
    pendientes,
    listoParaSalida: pendientes.every((r) => r.id === "entrega"),
    cuenta,
  };
}

/** Evalúa el proceso de una venta tal como sale de la base (con los ids de sus productos). */
export function procesoDeVenta(v: Omit<EntradaProceso, "productosVendidos"> & { productos: string[] }, catalogoProductos: { id: string; clave: string }[]) {
  const claves = catalogoProductos.filter((p) => v.productos.includes(p.id)).map((p) => p.clave);
  return evaluarProceso({ ...v, productosVendidos: claves });
}
