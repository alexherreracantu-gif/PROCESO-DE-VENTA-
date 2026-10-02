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
  const c = convenio(pctEnganche, modelo);
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
