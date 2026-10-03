/** Resultados por canal: prospectos, ventas, inversión y cuánto cuesta cada venta. */

export type FilaCanal = {
  canal: string; prospectos: number; ventas: number; conversion: number | null;
  inversion: number; costoProspecto: number | null; costoVenta: number | null; comision: number; retorno: number | null;
};

export function resultadosPorCanal(e: {
  prospectos: { origen: string | null }[];
  ventas: { origen: string | null; comision: number }[];
  inversion: { canal: string; monto: number }[];
}): { filas: FilaCanal[]; total: FilaCanal } {
  const nombre = (o: string | null) => (o?.trim() ? o.trim() : "Sin dato");
  const canales = new Map<string, { p: number; v: number; inv: number; com: number }>();
  const de = (c: string) => canales.get(c) ?? canales.set(c, { p: 0, v: 0, inv: 0, com: 0 }).get(c)!;
  for (const p of e.prospectos) de(nombre(p.origen)).p++;
  for (const v of e.ventas) { const x = de(nombre(v.origen)); x.v++; x.com += v.comision; }
  for (const i of e.inversion) de(nombre(i.canal)).inv += i.monto;
  const fila = (canal: string, x: { p: number; v: number; inv: number; com: number }): FilaCanal => ({
    canal, prospectos: x.p, ventas: x.v,
    // Si hay más ventas que prospectos registrados (clientes de piso sin alta en el CRM), no se puede calcular.
    conversion: x.p && x.v <= x.p ? x.v / x.p : null,
    inversion: x.inv,
    costoProspecto: x.inv && x.p ? x.inv / x.p : null,
    costoVenta: x.inv && x.v ? x.inv / x.v : null,
    comision: x.com,
    retorno: x.inv ? x.com - x.inv : null,
  });
  const filas = [...canales.entries()].map(([c, x]) => fila(c, x))
    .sort((a, b) => b.ventas - a.ventas || b.prospectos - a.prospectos || b.inversion - a.inversion);
  const suma = [...canales.values()].reduce((t, x) => ({ p: t.p + x.p, v: t.v + x.v, inv: t.inv + x.inv, com: t.com + x.com }), { p: 0, v: 0, inv: 0, com: 0 });
  return { filas, total: fila("Total", suma) };
}
