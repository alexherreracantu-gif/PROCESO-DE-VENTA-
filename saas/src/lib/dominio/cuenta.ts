/**
 * Cuenta del cliente: lo que debe (factura + cargos) contra lo que ha pagado, por concepto,
 * igual que la "aplicación de pago" de caja. Si falta aunque sea $1, el carro no sale.
 */

/** Conceptos de cargo (mismos renglones que la aplicación de pago). `factura` sale del valor factura. */
export const CARGOS = [
  { id: "factura", label: "Factura de la unidad" },
  { id: "accesorios", label: "Accesorios" },
  { id: "garantia_llantas", label: "Garantía de llantas" },
  { id: "instalacion", label: "Instalación" },
  { id: "llanta_refaccion", label: "Llanta de refacción" },
  { id: "garantia_ext", label: "Garantía extendida" },
  { id: "seguro", label: "Seguro" },
  { id: "placas", label: "Placas" },
  { id: "gestoria", label: "Gestoría" },
  { id: "permiso", label: "Permiso de frontera" },
  { id: "otro", label: "Otro" },
] as const;
export type ConceptoCargo = (typeof CARGOS)[number]["id"];

/** De dónde sale el dinero. */
export const ORIGENES = [
  { id: "separacion", label: "Separación", ayuda: "Caja la aplica a Accesorios con el código de cliente." },
  { id: "cliente", label: "Pago del cliente", ayuda: "Enganche, diferencias y pagos de productos." },
  { id: "desembolso", label: "Desembolso del banco", ayuda: "Lo que deposita el banco del crédito." },
  { id: "bono", label: "Bono / nota de crédito", ayuda: "Bonificación de la agencia o de BYD." },
  { id: "toma", label: "Auto a cuenta", ayuda: "Valor de la toma aplicado a la compra." },
  { id: "otro", label: "Otro", ayuda: "" },
] as const;
export type OrigenPago = (typeof ORIGENES)[number]["id"];

/** Pagos que deben tener su recibo de caja (el bono va con su nota de crédito). */
export const ORIGENES_CON_RECIBO: OrigenPago[] = ["separacion", "cliente", "desembolso"];

export const FORMAS_COBRO = ["Transferencia", "Tarjeta de débito", "Tarjeta de crédito", "Efectivo", "Cheque", "Depósito", "Nota de crédito"] as const;

export const BANCOS = ["Banorte", "BBVA", "Santander", "KUNA", "Mstar", "HSBC", "Scotiabank", "Otro"] as const;

/** Producto del catálogo → concepto de cargo (para sugerir los cargos de lo que se vendió). */
export const CARGO_DE_PRODUCTO: Record<string, ConceptoCargo> = {
  garantia: "garantia_ext",
  accesorios: "accesorios",
  cerocible: "seguro",
  llantas: "garantia_llantas",
  placas: "gestoria",
  seguro: "seguro",
  refaccion: "llanta_refaccion",
};

export const labelCargo = (id: string | null | undefined) => CARGOS.find((c) => c.id === id)?.label ?? "Otro";
export const labelOrigen = (id: string | null | undefined) => ORIGENES.find((c) => c.id === id)?.label ?? "Otro";
export const esConceptoCargo = (v: string): v is ConceptoCargo => CARGOS.some((c) => c.id === v);
export const esOrigen = (v: string): v is OrigenPago => ORIGENES.some((c) => c.id === v);

export type Movimiento = {
  id: string;
  tipo: "cargo" | "pago";
  concepto: string;
  aplica_a: string | null;
  monto: number;
  fecha: string;
  forma: string | null;
  referencia: string | null;
  notas: string | null;
};

export type DatosCredito = {
  banco?: string | null;
  monto?: number | null;
  enganche?: number | null;
  plazo?: number | null;
  tasa?: number | null;
  fecha?: string | null;
};

export type FilaConcepto = { concepto: string; label: string; cargo: number; pagado: number; pendiente: number };

export type ResultadoCuenta = {
  /** Hay valor factura capturado. */
  completo: boolean;
  totalCargos: number;
  totalPagos: number;
  /** pagos − cargos: negativo = adeudo; positivo = saldo a favor. */
  saldo: number;
  sinAdeudo: boolean;
  porConcepto: FilaConcepto[];
  porOrigen: { origen: string; label: string; monto: number }[];
  desembolso: number;
  /** Desembolso recibido − monto aprobado (solo si hay los dos). */
  diferenciaDesembolso: number | null;
};

const n = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
export const centavos = (v: number) => Math.round(v * 100) / 100;

export function calcularCuenta(valorFactura: number | null | undefined, movimientos: Movimiento[], credito: DatosCredito = {}): ResultadoCuenta {
  const cargo = new Map<string, number>();
  const pagado = new Map<string, number>();
  const origen = new Map<string, number>();
  if (n(valorFactura) > 0) cargo.set("factura", n(valorFactura));
  for (const m of movimientos) {
    if (m.tipo === "cargo") cargo.set(m.concepto, n(cargo.get(m.concepto)) + n(m.monto));
    else {
      const a = m.aplica_a || "factura";
      pagado.set(a, n(pagado.get(a)) + n(m.monto));
      origen.set(m.concepto, n(origen.get(m.concepto)) + n(m.monto));
    }
  }
  const claves = [...new Set([...cargo.keys(), ...pagado.keys()])]
    .sort((a, b) => CARGOS.findIndex((c) => c.id === a) - CARGOS.findIndex((c) => c.id === b));
  const porConcepto = claves.map((c) => ({
    concepto: c, label: labelCargo(c), cargo: centavos(n(cargo.get(c))), pagado: centavos(n(pagado.get(c))),
    pendiente: centavos(n(cargo.get(c)) - n(pagado.get(c))),
  }));
  const totalCargos = centavos([...cargo.values()].reduce((t, v) => t + v, 0));
  const totalPagos = centavos([...pagado.values()].reduce((t, v) => t + v, 0));
  const saldo = centavos(totalPagos - totalCargos);
  const desembolso = centavos(n(origen.get("desembolso")));
  return {
    completo: n(valorFactura) > 0,
    totalCargos,
    totalPagos,
    saldo,
    sinAdeudo: n(valorFactura) > 0 && saldo >= 0,
    porConcepto,
    porOrigen: ORIGENES.filter((o) => origen.has(o.id)).map((o) => ({ origen: o.id, label: o.label, monto: centavos(n(origen.get(o.id))) })),
    desembolso,
    diferenciaDesembolso: desembolso > 0 && n(credito.monto) > 0 ? centavos(desembolso - n(credito.monto)) : null,
  };
}
