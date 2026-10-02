/** Cálculos del tablero. Funciones puras: reciben filas y regresan números. */

export type VentaReporte = {
  id: string;
  fecha: string;
  vendedor_id: string;
  modelo_id: string;
  color: string;
  estatus: string;
  productos: string[]; // ids de producto
};

export type Resumen = {
  unidades: number;
  entregadas: number;
  totalProductos: number;
  productosPorUnidad: number;
  porProducto: Record<string, number>;
  porModelo: { id: string; n: number }[];
  porColor: { id: string; n: number }[];
  porVendedor: Record<string, { unidades: number; productos: number }>;
};

const ordenar = (m: Map<string, number>) => [...m.entries()].map(([id, n]) => ({ id, n })).sort((a, b) => b.n - a.n || a.id.localeCompare(b.id));

/** Las canceladas no cuentan. */
export function resumir(ventas: VentaReporte[], productos: { id: string }[] = []): Resumen {
  const vivas = ventas.filter((v) => v.estatus !== "cancelada");
  const porProducto: Record<string, number> = Object.fromEntries(productos.map((p) => [p.id, 0]));
  const modelos = new Map<string, number>(), colores = new Map<string, number>();
  const porVendedor: Resumen["porVendedor"] = {};
  let totalProductos = 0, entregadas = 0;
  for (const v of vivas) {
    const prods = [...new Set(v.productos)];
    for (const p of prods) porProducto[p] = (porProducto[p] ?? 0) + 1;
    totalProductos += prods.length;
    modelos.set(v.modelo_id, (modelos.get(v.modelo_id) ?? 0) + 1);
    colores.set(v.color || "Sin color", (colores.get(v.color || "Sin color") ?? 0) + 1);
    const pv = (porVendedor[v.vendedor_id] ??= { unidades: 0, productos: 0 });
    pv.unidades++; pv.productos += prods.length;
    if (v.estatus === "entregada") entregadas++;
  }
  return {
    unidades: vivas.length,
    entregadas,
    totalProductos,
    productosPorUnidad: vivas.length ? totalProductos / vivas.length : 0,
    porProducto,
    porModelo: ordenar(modelos),
    porColor: ordenar(colores),
    porVendedor,
  };
}

export function penetracion(r: Resumen, productoId: string): number {
  return r.unidades ? (r.porProducto[productoId] ?? 0) / r.unidades : 0;
}

/** Unidades por semana que hacen falta para llegar a la meta con los días que quedan. */
export function ritmoNecesario(meta: number, vendidas: number, diasRestantes: number): number {
  const faltan = Math.max(meta - vendidas, 0);
  if (!faltan) return 0;
  return faltan / Math.max(diasRestantes / 7, 1 / 7);
}

/** Proyección lineal al cierre del mes. */
export function proyeccion(vendidas: number, diaActual: number, diasMes: number): number {
  if (diaActual <= 0) return vendidas;
  return Math.round((vendidas / diaActual) * diasMes);
}
