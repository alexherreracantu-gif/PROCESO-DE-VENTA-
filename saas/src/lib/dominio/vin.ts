/** VIN: 17 caracteres, letras y números, sin I, O ni Q. */
export const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

export function normalizarVin(v: string | null | undefined): string {
  return String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export type EstadoVin = { valido: boolean; mensaje: string; tono: "neutro" | "ok" | "error" };

export function revisarVin(v: string): EstadoVin {
  const x = normalizarVin(v);
  if (!x) return { valido: true, mensaje: "Está en la factura, el parabrisas o el marco de la puerta.", tono: "neutro" };
  if (/[IOQ]/.test(x)) return { valido: false, mensaje: "Un VIN no lleva I, O ni Q. Revisa si es 1 o 0.", tono: "error" };
  if (x.length < 17) return { valido: false, mensaje: `${x.length} de 17 caracteres`, tono: "neutro" };
  if (x.length > 17) return { valido: false, mensaje: "Sobran caracteres: el VIN tiene 17.", tono: "error" };
  return { valido: true, mensaje: "VIN completo", tono: "ok" };
}
