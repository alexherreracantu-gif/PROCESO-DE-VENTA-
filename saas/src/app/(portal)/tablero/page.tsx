import Link from "next/link";
import { Plus } from "lucide-react";
import { catalogo, equipo, metaProducto, metaUnidades, metasDelMes, ventasDelMes } from "@/lib/datos";
import { requerirSesion } from "@/lib/sesion";
import { colorHex, estatusInfo } from "@/lib/dominio/catalogos";
import { esMes, fechaCorta, fechaLarga, hoy, horaMty, mesActual, nombreMes } from "@/lib/dominio/fechas";
import { decimal, dinero, porcentaje } from "@/lib/dominio/formato";
import { penetracion, resumir } from "@/lib/dominio/reportes";
import { BotonEnlace, Encabezado, FilaBarra, Indicador, Leyenda, MuestraColor, Pastilla, Segmentos, Tabla, Tarjeta, TituloTarjeta, Vacio } from "@/components/ui";
import { Ranking } from "@/components/tablero/ranking";
import { SelectorMes } from "@/components/selector-mes";
import { AccionesTablero } from "./acciones-cliente";
import type { DatosImagen } from "@/components/tablero/imagen-reporte";

export const metadata = { title: "Tablero de reporte" };

const csvCelda = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export default async function Tablero(props: PageProps<"/tablero">) {
  const s = await requerirSesion();
  const sp = await props.searchParams;
  const mes = esMes(sp.mes as string) ? (sp.mes as string) : mesActual();
  const vendedor = s.direccion ? (typeof sp.vendedor === "string" && sp.vendedor !== "todos" ? sp.vendedor : null) : s.perfil.id;
  const [cat, eq, metas, ventas] = await Promise.all([catalogo(s, true), equipo(s), metasDelMes(s, mes), ventasDelMes(s, mes, vendedor)]);
  const productos = cat.productos.filter((p) => p.activo);
  const vendedores = eq.filter((p) => p.vende && p.activo);
  const r = resumir(ventas, productos);
  const meta = vendedor ? metaUnidades(s, metas, vendedor) : vendedores.reduce((t, v) => t + metaUnidades(s, metas, v.id), 0);
  const quien = vendedor ? eq.find((p) => p.id === vendedor)?.nombre ?? "" : "Equipo completo";
  const nombreModelo = new Map(cat.modelos.map((m) => [m.id, `${m.nombre} ${m.anio}`]));
  const corto = new Map(eq.map((p) => [p.id, p.nombre_corto]));
  const vivas = ventas.filter((v) => v.estatus !== "cancelada");
  const precioProducto = new Map(productos.map((p) => [p.id, p.precio ?? 0]));
  const ventaProductos = vivas.reduce((t, v) => t + v.productos.reduce((u, p) => u + (precioProducto.get(p) ?? 0), 0), 0);
  const enlace = (v: string) => `/tablero?mes=${mes}${v !== "todos" ? `&vendedor=${v}` : ""}`;
  const ranking = !vendedor ? vendedores.map((v) => ({ id: v.id, nombre: v.nombre, unidades: r.porVendedor[v.id]?.unidades ?? 0, productos: r.porVendedor[v.id]?.productos ?? 0, meta: metaUnidades(s, metas, v.id) })) : null;

  const indicadores = [
    { etiqueta: "Unidades vendidas", valor: String(r.unidades), nota: `Meta: ${meta}` },
    { etiqueta: "Cumplimiento", valor: porcentaje(meta ? r.unidades / meta : 0), nota: r.unidades >= meta && meta ? "Meta cumplida" : `Faltan ${Math.max(meta - r.unidades, 0)}` },
    { etiqueta: "Productos por unidad", valor: decimal(r.productosPorUnidad), nota: `${r.totalProductos} productos` },
    { etiqueta: "Entregadas", valor: String(r.entregadas), nota: `${r.unidades - r.entregadas} por entregar` },
  ];
  const datosImagen: DatosImagen = {
    agencia: s.agencia.nombre, grupo: s.agencia.grupo ?? s.agencia.marca, titulo: `Reporte de ventas · ${nombreMes(mes).replace(/^./, (c) => c.toUpperCase())}`,
    quien, corte: `Corte al ${fechaLarga(hoy()).toLowerCase()} · ${horaMty()}`, generadoPor: s.perfil.rol === "ceo" ? "CEO" : s.perfil.nombre,
    indicadores,
    productos: productos.map((p) => ({ etiqueta: p.nombre, pct: penetracion(r, p.id), n: r.porProducto[p.id] ?? 0, total: r.unidades, meta: metaProducto(s, metas, p.id) / 100 })),
    ranking: ranking ? [...ranking].sort((a, b) => b.unidades - a.unidades).map((f) => ({ nombre: f.nombre, unidades: f.unidades, meta: f.meta, pu: f.unidades ? decimal(f.productos / f.unidades) : "0.0" })) : null,
    modelos: r.porModelo.slice(0, 8).map((m) => ({ etiqueta: nombreModelo.get(m.id) ?? "Modelo", n: m.n })),
    colores: r.porColor.slice(0, 8).map((c) => ({ etiqueta: c.id, hex: colorHex(c.id), n: c.n })),
    detalle: vivas.map((v) => ({ fecha: fechaCorta(v.fecha), vendedor: corto.get(v.vendedor_id) ?? "", cliente: v.cliente, num: v.num_cliente ?? "", vin: v.vin ?? "", modelo: nombreModelo.get(v.modelo_id) ?? "", color: v.color_nombre || v.color, hex: colorHex(v.color), prod: `${v.productos.length}/${productos.length}` })),
  };
  const encabezadoCsv = ["Folio", "Fecha", "Vendedor", "Cliente", "Número de cliente", "VIN", "Modelo", "Color", "Nombre del color", "Forma de pago", "Plaza", "Estatus", "Fecha de entrega", ...productos.map((p) => p.nombre), "Productos"];
  const csv = [encabezadoCsv, ...ventas.map((v) => [v.folio, v.fecha, eq.find((p) => p.id === v.vendedor_id)?.nombre ?? "", v.cliente, v.num_cliente, v.vin, nombreModelo.get(v.modelo_id), v.color, v.color_nombre, v.forma_pago, v.plaza, estatusInfo(v.estatus).label, v.fecha_entrega, ...productos.map((p) => (v.productos.includes(p.id) ? "Sí" : "No")), v.productos.length])]
    .map((f) => f.map(csvCelda).join(",")).join("\n");

  return (
    <>
      <Encabezado eyebrow="Tablero de reporte" titulo={nombreMes(mes).replace(/^./, (c) => c.toUpperCase())} descripcion={`${quien} · ${s.agencia.nombre}. Descárgalo como imagen para mandarlo por WhatsApp.`}>
        <AccionesTablero datos={datosImagen} csv={csv} nombreArchivo={`reporte-park-point-${mes}-${vendedor ? corto.get(vendedor)?.toLowerCase() ?? "vendedor" : "equipo"}`} />
      </Encabezado>
      <div className="flex flex-wrap items-center gap-3">
        <SelectorMes mes={mes} base="/tablero" extra={s.direccion && vendedor ? { vendedor } : undefined} />
        {s.direccion ? <Segmentos etiqueta="Vendedor" actual={vendedor ?? "todos"} opciones={[{ valor: "todos", texto: "Equipo", href: enlace("todos") }, ...vendedores.map((v) => ({ valor: v.id, texto: v.nombre_corto, href: enlace(v.id) }))]} /> : null}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {indicadores.map((i, n) => <Indicador key={i.etiqueta} etiqueta={i.etiqueta} valor={i.valor} nota={i.nota} tono={n === 1 && r.unidades >= meta && meta ? "ok" : undefined} />)}
      </div>

      {!r.unidades ? (
        <Vacio titulo={`Sin ventas en ${nombreMes(mes)}`} accion={s.perfil.vende || s.direccion ? <BotonEnlace href="/ventas?nueva=1" icono={Plus}>Registrar venta</BotonEnlace> : null}>
          En cuanto haya ventas verás aquí la penetración por producto, el ranking, los modelos y los colores.
        </Vacio>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <Tarjeta>
              <TituloTarjeta titulo="Penetración por producto" nota="% de unidades que lo llevan" />
              <div className="grid gap-2.5">
                {productos.map((p) => {
                  const pc = penetracion(r, p.id);
                  return <FilaBarra key={p.id} etiqueta={<><span className="sm:hidden">{p.nombre_corto}</span><span className="max-sm:hidden">{p.nombre}</span></>} valor={pc} max={1} meta={metaProducto(s, metas, p.id) / 100} titulo={`${p.nombre}: ${r.porProducto[p.id] ?? 0} de ${r.unidades}`} texto={<>{porcentaje(pc)}<span className="ml-1 font-normal text-muted">{r.porProducto[p.id] ?? 0}/{r.unidades}</span></>} />;
                })}
              </div>
              <Leyenda />
              <p className="mt-3 border-t border-line pt-3 text-[0.82rem] text-muted">Productos vendidos a precio de catálogo: <strong className="text-fg">{dinero(ventaProductos)}</strong></p>
            </Tarjeta>
            {ranking ? <Ranking filas={ranking} titulo="Ranking de vendedores" /> : (
              <Tarjeta>
                <TituloTarjeta titulo="Avance contra la meta" />
                <FilaBarra etiqueta="Unidades" valor={r.unidades} max={Math.max(meta, r.unidades, 1)} meta={meta} texto={<>{r.unidades}<span className="font-normal text-muted"> / {meta}</span></>} />
                <Leyenda />
              </Tarjeta>
            )}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Tarjeta>
              <TituloTarjeta titulo="Unidades por modelo" />
              <div className="grid gap-2.5">{r.porModelo.map((m) => <FilaBarra key={m.id} etiqueta={nombreModelo.get(m.id) ?? "Modelo"} valor={m.n} max={r.porModelo[0].n} texto={<>{m.n}<span className="ml-1 font-normal text-muted">{porcentaje(m.n / r.unidades)}</span></>} />)}</div>
            </Tarjeta>
            <Tarjeta>
              <TituloTarjeta titulo="Unidades por color" />
              <div className="grid gap-2.5">{r.porColor.map((c) => <FilaBarra key={c.id} etiqueta={c.id} muestra={colorHex(c.id)} valor={c.n} max={r.porColor[0].n} texto={<>{c.n}<span className="ml-1 font-normal text-muted">{porcentaje(c.n / r.unidades)}</span></>} />)}</div>
            </Tarjeta>
          </div>
          <Tarjeta className="p-2 sm:p-3">
            <div className="px-3 pt-2"><TituloTarjeta titulo="Detalle de ventas" nota={`${vivas.length} unidades`} /></div>
            <Tabla>
              <thead><tr><th>Fecha</th>{!vendedor ? <th>Vendedor</th> : null}<th>Cliente</th><th>VIN</th><th>Modelo</th><th>Color</th>{productos.map((p) => <th key={p.id} className="!text-center" title={p.nombre}>{p.nombre_corto}</th>)}<th>Estatus</th></tr></thead>
              <tbody>
                {ventas.map((v) => {
                  const est = estatusInfo(v.estatus);
                  return (
                    <tr key={v.id} className={v.estatus === "cancelada" ? "opacity-50" : ""}>
                      <td className="whitespace-nowrap">{fechaCorta(v.fecha)}</td>
                      {!vendedor ? <td>{corto.get(v.vendedor_id)}</td> : null}
                      <td className="min-w-[160px]"><Link href={`/ventas/${v.id}`} className="font-semibold hover:underline">{v.cliente}</Link>{v.num_cliente ? <span className="block text-[0.76rem] text-muted">Cliente {v.num_cliente}</span> : null}</td>
                      <td className="whitespace-nowrap font-mono text-[0.78rem]">{v.vin ?? "—"}</td>
                      <td className="whitespace-nowrap">{nombreModelo.get(v.modelo_id)}</td>
                      <td className="whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><MuestraColor hex={colorHex(v.color)} />{v.color_nombre || v.color}</span></td>
                      {productos.map((p) => <td key={p.id} className="text-center">{v.productos.includes(p.id) ? <span className="font-bold text-ok" aria-label="Sí">✓</span> : <span className="text-subtle" aria-label="No">·</span>}</td>)}
                      <td><Pastilla tono={est.tono}>{est.label}</Pastilla></td>
                    </tr>
                  );
                })}
              </tbody>
            </Tabla>
          </Tarjeta>
        </>
      )}
    </>
  );
}
