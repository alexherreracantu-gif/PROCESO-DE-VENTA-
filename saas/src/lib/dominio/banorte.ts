/**
 * Fórmulas Banorte · Plan Tradicional (validadas al centavo contra el cotizador oficial).
 *   Monto a financiar = precio + accesorios + garantía − enganche
 *   Comisión          = convenio% × 1.16 × monto, truncada a centavos
 *   Tasa mensual      = tasa anual × 1.16 × 30.41 / 360
 *   Mensualidad       = monto · r / (1 − (1 + r)^−n), truncada a centavos
 *   % de enganche     = enganche ÷ (precio + accesorios)
 */

export type ModeloCotizable = { clave: string; anio: number; motor: "electrico" | "hibrido"; precio: number; bono: number };
export type Convenio = { nombre: string; tasa: number; comision: number };

export const PLAZOS = [12, 24, 36, 48, 60, 72] as const;

export function truncar(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n * 100 + Number.EPSILON) / 100;
}

export function tasaMensual(tasaAnual: number): number {
  return (tasaAnual * 1.16 * 30.41) / 360;
}

export function mensualidad(monto: number, tasaAnual: number, plazo: number): number {
  if (monto <= 0 || plazo <= 0) return 0;
  const r = tasaMensual(tasaAnual);
  if (r === 0) return truncar(monto / plazo);
  return truncar((monto * r) / (1 - Math.pow(1 + r, -plazo)));
}

/** Convenio por % de enganche: por default, la tasa más baja disponible. */
export function convenio(pctEnganche: number, modelo: Pick<ModeloCotizable, "clave" | "anio" | "motor">): Convenio {
  if (pctEnganche >= 0.5 && modelo.clave.startsWith("king-gl") && modelo.anio >= 2027) return { nombre: "BYD KING DM-i 2027", tasa: 0.0718, comision: 0.02 };
  if (pctEnganche >= 0.5 && modelo.motor === "electrico") return { nombre: "BYD ELECTRIC WEEKEND", tasa: 0.0718, comision: 0.025 };
  if (pctEnganche >= 0.5) return { nombre: "BYD 7.88%", tasa: 0.0788, comision: 0.02 };
  if (pctEnganche >= 0.4) return { nombre: "BYD ESP 2%", tasa: 0.1088, comision: 0.02 };
  if (pctEnganche >= 0.25) return { nombre: "BYD ESP 2%", tasa: 0.1188, comision: 0.02 };
  if (pctEnganche >= 0.2) return { nombre: "BYD ESP 2%", tasa: 0.1388, comision: 0.02 };
  return { nombre: "Sin convenio", tasa: 0.1499, comision: 0.025 };
}

export type EntradaCotizacion = {
  modelo: ModeloCotizable;
  /** Lo que pone el cliente (sin contar el bono). */
  aportacion: number;
  accesorios: number;
  /** Garantía extendida financiada (0 si no). */
  garantia: number;
  plazo: number;
  placas: number;
  tramites: number;
  /** Convenio elegido a mano; si no, el de mejor tasa para el enganche. */
  convenio?: Convenio | null;
};

export type Cotizacion = {
  base: number;
  bonoAplica: boolean;
  bono: number;
  enganche: number;
  pctEnganche: number;
  convenio: Convenio;
  monto: number;
  comision: number;
  mensualidad: number;
  /** Pago a la firma sin seguros de auto y vida. */
  pagoFirma: number;
};

/** El bono flexible solo aplica financiando, desde 5% de enganche (bono incluido). */
export function cotizar(e: EntradaCotizacion): Cotizacion {
  const { modelo } = e;
  const aportacion = Math.max(0, e.aportacion);
  const base = modelo.precio + e.accesorios;
  const bonoAplica = base > 0 && modelo.bono > 0 && (aportacion + modelo.bono) / base >= 0.05;
  const bono = bonoAplica ? modelo.bono : 0;
  const enganche = Math.min(aportacion + bono, modelo.precio + e.accesorios + e.garantia);
  const pctEnganche = base > 0 ? enganche / base : 0;
  const c = e.convenio ?? convenio(pctEnganche, modelo);
  const monto = Math.max(0, modelo.precio + e.accesorios + e.garantia - enganche);
  const comision = truncar(c.comision * 1.16 * monto);
  return {
    base,
    bonoAplica,
    bono,
    enganche,
    pctEnganche,
    convenio: c,
    monto,
    comision,
    mensualidad: mensualidad(monto, c.tasa, e.plazo),
    pagoFirma: truncar(aportacion + comision + e.placas + e.tramites),
  };
}

/**
 * Inverso: ¿cuánto debe aportar el cliente para pagar `D` a la firma?
 * aportación = (D − trámites − placas − c·(precio + acc + garantía − bono)) ÷ (1 − c), con c = convenio% × 1.16.
 * Se itera porque el convenio depende del enganche.
 */
export function aportacionParaPagoFirma(e: Omit<EntradaCotizacion, "aportacion">, D: number): number {
  let aportacion = Math.max(0, D - e.placas - e.tramites);
  for (let i = 0; i < 4; i++) {
    const q = cotizar({ ...e, aportacion });
    const c = q.convenio.comision * 1.16;
    const total = e.modelo.precio + e.accesorios + e.garantia;
    aportacion = (D - e.placas - e.tramites - c * (total - q.bono)) / (1 - c);
    aportacion = Math.min(total, Math.max(0, aportacion));
  }
  return truncar(aportacion);
}

/** Todos los convenios a los que alcanza el enganche (mejor tasa primero), para elegir a mano. */
export function conveniosDisponibles(pctEnganche: number, modelo: Pick<ModeloCotizable, "clave" | "anio" | "motor">): Convenio[] {
  const lista: Convenio[] = [];
  const umbrales = [0.5, 0.4, 0.25, 0.2, 0];
  for (const u of umbrales) if (pctEnganche >= u) lista.push(convenio(u, modelo));
  if (pctEnganche >= 0.5 && (lista[0].tasa < 0.0788)) lista.splice(1, 0, { nombre: "BYD 7.88%", tasa: 0.0788, comision: 0.02 });
  const vistos = new Set<string>();
  return lista.filter((c) => { const k = `${c.nombre}-${c.tasa}`; if (vistos.has(k)) return false; vistos.add(k); return true; })
    .sort((a, b) => a.tasa - b.tasa);
}

export type EntradaInterna = {
  modelo: ModeloCotizable;
  /** Enganche total que ve el cliente, incluido el bono. */
  engancheTotal: number;
  /** Accesorios, Wallbox, Cerocible, seguro de llantas… (todo financiado). */
  accesorios: number;
  garantia: number;
  plazo: number;
  convenio?: Convenio | null;
  /** Seguros del primer año que se pagan a la firma (capturados de Banorte). */
  seguros: number;
};

/**
 * Cotización como la hace el asesor: captura el enganche total (con el bono) y el portal separa
 * cuánto pone el cliente. "De la bolsa del cliente a la firma" = aportación + comisión + seguros
 * (placas y gestoría van aparte).
 */
export function cotizacionInterna(e: EntradaInterna) {
  const base = e.modelo.precio + e.accesorios;
  const conBono = e.modelo.bono > 0 && base > 0 && e.engancheTotal / base >= 0.05;
  const aportacion = Math.max(0, conBono ? e.engancheTotal - e.modelo.bono : e.engancheTotal);
  const q = cotizar({ modelo: e.modelo, aportacion, accesorios: e.accesorios, garantia: e.garantia, plazo: e.plazo, placas: 0, tramites: 0, convenio: e.convenio });
  const bolsaFirma = truncar(aportacion + q.comision + e.seguros);
  const plazos = PLAZOS.map((n) => ({ n, mensualidad: cotizar({ modelo: e.modelo, aportacion, accesorios: e.accesorios, garantia: e.garantia, plazo: n, placas: 0, tramites: 0, convenio: e.convenio }).mensualidad }));
  return { ...q, aportacion, bolsaFirma, plazos, disponibles: conveniosDisponibles(q.pctEnganche, e.modelo) };
}

/** Inverso: ¿qué enganche total da un presupuesto a la firma `D`? (seguros incluidos en D). */
export function engancheParaPresupuesto(e: Omit<EntradaInterna, "engancheTotal">, D: number): number {
  const ap = aportacionParaPagoFirma({ modelo: e.modelo, accesorios: e.accesorios, garantia: e.garantia, plazo: e.plazo, placas: 0, tramites: e.seguros, convenio: e.convenio }, D);
  const q = cotizar({ modelo: e.modelo, aportacion: ap, accesorios: e.accesorios, garantia: e.garantia, plazo: e.plazo, placas: 0, tramites: 0, convenio: e.convenio });
  return truncar(ap + (q.bonoAplica ? q.bono : 0));
}
