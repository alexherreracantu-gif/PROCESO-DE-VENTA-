const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const mxn2 = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const dinero = (n: number | null | undefined) => mxn.format(n ?? 0);
export const dinero2 = (n: number | null | undefined) => mxn2.format(n ?? 0);
export const porcentaje = (n: number) => `${Math.round((Number.isFinite(n) ? n : 0) * 100)}%`;
export const decimal = (n: number, d = 1) => (Number.isFinite(n) ? n : 0).toFixed(d);
export function iniciales(nombre: string): string {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
}
export function telefonoWa(tel: string | null | undefined): string {
  let t = String(tel ?? "").replace(/\D/g, "");
  if (t.length === 10) t = "52" + t;
  return t;
}
export function enlaceWhatsApp(tel: string | null | undefined, texto?: string): string {
  const t = telefonoWa(tel);
  return `https://wa.me/${t}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}
