/**
 * Cuadre sin adeudo: lo que se cubrió (enganche + bonos + desembolso + pagos adicionales)
 * contra lo que se debe (valor factura + extras). Si falta aunque sea $1, el carro no sale.
 */
export type DatosCuadre = {
  valor_factura?: number | null;
  enganche?: number | null;
  separacion?: number | null;
  bonos?: number | null;
  desembolso_real?: number | null;
  pagos_adicionales?: number | null;
  extras?: number | null;
};

export type ResultadoCuadre = {
  completo: boolean;
  separacion: number;
  engancheRestante: number;
  desembolsoEsperado: number;
  desembolso: number;
  diferenciaDesembolso: number | null;
  total: number;
  cubierto: number;
  saldo: number;
  sale: boolean;
};

const n = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const centavos = (v: number) => Math.round(v * 100) / 100;

export function calcularCuadre(d: DatosCuadre, formaPago: string, separacionDefault = 5000): ResultadoCuadre {
  const contado = formaPago === "Contado";
  const separacion = d.separacion == null ? separacionDefault : n(d.separacion);
  const enganche = n(d.enganche);
  const desembolsoEsperado = contado ? 0 : Math.max(n(d.valor_factura) - enganche - n(d.bonos), 0);
  const desembolso = contado ? 0 : d.desembolso_real == null ? desembolsoEsperado : n(d.desembolso_real);
  const total = n(d.valor_factura) + n(d.extras);
  const cubierto = enganche + n(d.bonos) + desembolso + n(d.pagos_adicionales);
  const saldo = centavos(cubierto - total);
  return {
    completo: n(d.valor_factura) > 0,
    separacion,
    engancheRestante: Math.max(enganche - separacion, 0),
    desembolsoEsperado: centavos(desembolsoEsperado),
    desembolso: centavos(desembolso),
    diferenciaDesembolso: contado || d.desembolso_real == null ? null : centavos(n(d.desembolso_real) - desembolsoEsperado),
    total: centavos(total),
    cubierto: centavos(cubierto),
    saldo,
    sale: n(d.valor_factura) > 0 && saldo >= 0,
  };
}
