/** CSV que Excel abre bien en español (con BOM y comillas donde hace falta). */
export function aCsv(filas: (string | number | null | undefined)[][]): string {
  const celda = (x: string | number | null | undefined) => {
    const t = x == null ? "" : String(x);
    return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return "﻿" + filas.map((f) => f.map(celda).join(",")).join("\r\n");
}
