/** Las 4 fotos de cada modelo: tres de exterior y una de interior. */
export const POSICIONES = [
  { n: 1, etiqueta: "Exterior 1" },
  { n: 2, etiqueta: "Exterior 2" },
  { n: 3, etiqueta: "Exterior 3" },
  { n: 4, etiqueta: "Interior" },
] as const;

export const esPosicion = (n: number) => Number.isInteger(n) && n >= 1 && n <= 4;

/** "King GL DM-i 2027", 4 → "king-gl-dm-i-2027-interior.jpg" */
export function nombreFoto(modelo: string, posicion: number) {
  const base = modelo.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const parte = posicion === 4 ? "interior" : `exterior-${posicion}`;
  return `${base}-${parte}.jpg`;
}
