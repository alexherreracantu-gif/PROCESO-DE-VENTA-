/** Fechas en hora de Monterrey. Todas las fechas de negocio son "YYYY-MM-DD" y los meses "YYYY-MM". */
const ZONA = "America/Monterrey";
export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function hoy(ahora: Date = new Date()): string {
  return ahora.toLocaleDateString("en-CA", { timeZone: ZONA });
}
export function mesActual(ahora: Date = new Date()): string {
  return hoy(ahora).slice(0, 7);
}
export function horaMty(ahora: Date = new Date()): string {
  return ahora.toLocaleTimeString("es-MX", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hour12: false });
}
export function esMes(m: string | undefined | null): m is string {
  return !!m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
}
/** Primer día del mes (para la base de datos) y primer día del siguiente. */
export function rangoMes(mes: string): { desde: string; hasta: string } {
  const [a, m] = mes.split("-").map(Number);
  const sig = m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
  return { desde: `${mes}-01`, hasta: `${sig}-01` };
}
export function mesAnterior(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}
export function nombreMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} ${a}`;
}
export function diasDelMes(mes: string): number {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}
/** Días que faltan del mes contando hoy; 0 si el mes ya pasó; todos si es futuro. */
export function diasRestantes(mes: string, fechaHoy: string = hoy()): number {
  const actual = fechaHoy.slice(0, 7);
  if (mes < actual) return 0;
  if (mes > actual) return diasDelMes(mes);
  return diasDelMes(mes) - Number(fechaHoy.slice(8, 10)) + 1;
}
export function fechaCorta(f: string | null | undefined): string {
  if (!f) return "";
  const [, m, d] = f.split("-").map(Number);
  return `${d} ${MESES[m - 1].slice(0, 3)}`;
}
export function fechaLarga(f: string): string {
  const d = new Date(`${f}T12:00:00Z`);
  const t = d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
export function sumarDias(f: string, n: number): string {
  const d = new Date(`${f}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
