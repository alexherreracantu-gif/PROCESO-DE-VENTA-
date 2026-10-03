import Link from "next/link";
import { VISIBLE } from "@/lib/config";
import { AlertTriangle, BarChart3, CalendarClock, Calculator, ClipboardList, Clock, HeartHandshake, Plus, Receipt, Wallet } from "lucide-react";
import { catalogo, ventasConEntrega, cortesDelDia, equipo, metaProducto, metaUnidades, metasDelMes, ranking, seguimientosPendientes, ventasDelMes, ventasEnProceso, ventasRecientes } from "@/lib/datos";
import { requerirSesion } from "@/lib/sesion";
import { colorHex, ROLES } from "@/lib/dominio/catalogos";
import { procesoDeVenta } from "@/lib/dominio/proceso";
import { alertasVenta, postventa, type Alerta } from "@/lib/dominio/seguimiento";
import { diasDelMes, diasRestantes, fechaCorta, fechaLarga, hoy, mesActual, MESES, nombreMes, sumarDias } from "@/lib/dominio/fechas";
import { decimal, porcentaje } from "@/lib/dominio/formato";
import { penetracion, proyeccion, resumir, ritmoNecesario } from "@/lib/dominio/reportes";
import { BotonEnlace, Encabezado, FilaBarra, Indicador, Leyenda, MuestraColor, Pastilla, Progreso, Tarjeta, TituloTarjeta } from "@/components/ui";
import { Ranking } from "@/components/tablero/ranking";

export const metadata = { title: "Inicio" };

export default async function Inicio() {
  const s = await requerirSesion();
  const { perfil, direccion } = s;
  const mes = mesActual(), fecha = hoy();
  const [cat, eq, metas, filasRanking, recientes, enProceso, seguimientos, misVentas, cortes, entregadas] = await Promise.all([
    catalogo(s), equipo(s), metasDelMes(s, mes), ranking(s, mes), ventasRecientes(s, 6), ventasEnProceso(s),
    perfil.vende && VISIBLE.seguimientosEnInicio ? seguimientosPendientes(s, fecha, perfil.id) : Promise.resolve([]),
    perfil.vende ? ventasDelMes(s, mes, perfil.id) : Promise.resolve([]),
    direccion ? cortesDelDia(s, fecha) : Promise.resolve([]),
    ventasConEntrega(s, sumarDias(hoy(), -200), hoy()),
  ]);
  const mostrarSeguimientos = perfil.vende && VISIBLE.seguimientosEnInicio;
  const vendedores = eq.filter((p) => p.vende && p.activo);
  const nombreModelo = new Map(cat.modelos.map((m) => [m.id, `${m.nombre} ${m.anio}`]));
  const corto = new Map(eq.map((p) => [p.id, p.nombre_corto]));
  const restantes = diasRestantes(mes, fecha);
  const diaHoy = Number(fecha.slice(8, 10));

  const mio = resumir(misVentas.map((v) => ({ ...v })), cat.productos);
  const miMeta = metaUnidades(s, metas, perfil.id);
  const faltan = Math.max(miMeta - mio.unidades, 0);

  const rk = new Map(filasRanking.map((f) => [f.vendedor_id, f]));
  const filas = vendedores.map((v) => ({ id: v.id, nombre: v.nombre, unidades: rk.get(v.id)?.unidades ?? 0, productos: rk.get(v.id)?.productos ?? 0, meta: metaUnidades(s, metas, v.id), yo: v.id === perfil.id }));
  const totalEquipo = filas.reduce((t, f) => t + f.unidades, 0);
  const metaEquipo = filas.reduce((t, f) => t + f.meta, 0);
  const prodEquipo = filas.reduce((t, f) => t + f.productos, 0);
  const cortesHoy = new Set(cortes.map((c) => c.usuario_id));

  // Lo urgente: entregas, expedientes detenidos, recibos, adeudos y postventa que ya toca.
  const urgentes: (Alerta & { ventaId: string; cliente: string; vendedor: string })[] = [];
  for (const v of enProceso) {
    for (const a of alertasVenta(v, procesoDeVenta(v, cat.productos), fecha)) urgentes.push({ ...a, ventaId: v.id, cliente: v.cliente, vendedor: v.vendedor_id });
  }
  for (const v of entregadas) {
    if (v.estatus !== "entregada" || !v.fecha_entrega) continue;
    const toca = postventa(v.fecha_entrega, v.expediente, v.cliente, s.agencia.nombre, fecha).filter((x) => x.vencido);
    if (toca.length) urgentes.push({ tipo: "postventa", texto: `Postventa: ${toca.map((x) => x.label.toLowerCase()).join(", ")}`, grave: false, ventaId: v.id, cliente: v.cliente, vendedor: v.vendedor_id });
  }
  const ORDEN = { entrega: 0, adeudo: 1, detenido: 2, recibo: 3, postventa: 4 } as const;
  urgentes.sort((a, b) => Number(b.grave) - Number(a.grave) || ORDEN[a.tipo] - ORDEN[b.tipo]);
  const ICONO = { entrega: CalendarClock, adeudo: Wallet, detenido: Clock, recibo: Receipt, postventa: HeartHandshake } as const;

  return (
    <>
      <Encabezado eyebrow={`${s.agencia.nombre} · ${fechaLarga(fecha)}`} titulo={`Hola, ${perfil.rol === "ceo" ? "CEO" : perfil.nombre_corto}`}
        descripcion={`Sesión de ${perfil.rol === "ceo" ? "Dirección general" : perfil.nombre} · ${ROLES[perfil.rol]}${perfil.rol === "gerente" && perfil.vende ? " (también registras tus ventas)" : ""}.`} />

      <div className="flex flex-wrap gap-2">
        {perfil.vende || direccion ? <BotonEnlace href="/ventas?nueva=1" icono={Plus}>Registrar venta</BotonEnlace> : null}
        {perfil.vende ? <BotonEnlace href="/piso" variante="secundario" icono={ClipboardList}>Capturar corte</BotonEnlace> : null}
        <BotonEnlace href="/tablero" variante="secundario" icono={BarChart3}>Ver tablero</BotonEnlace>
        <BotonEnlace href="/cotizador" variante="secundario" icono={Calculator}>Cotizar</BotonEnlace>
      </div>

      <Tarjeta className={urgentes.some((u) => u.grave) ? "border-bad/40" : undefined}>
        <TituloTarjeta titulo={<span className="inline-flex items-center gap-2"><AlertTriangle className={urgentes.some((u) => u.grave) ? "size-4 text-bad" : "size-4 text-warn"} />Que no se te pase</span>}
          nota={urgentes.length ? `${urgentes.length} ${urgentes.length === 1 ? "pendiente" : "pendientes"}${direccion ? " del equipo" : ""}` : undefined}>
          <BotonEnlace href="/entregas" variante="secundario" tamano="sm" icono={CalendarClock}>Entregas</BotonEnlace>
        </TituloTarjeta>
        {urgentes.length ? (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-x-6 md:grid-cols-2">
            {urgentes.slice(0, 10).map((u, i) => {
              const Icono = ICONO[u.tipo];
              return (
                <li key={`${u.ventaId}-${u.tipo}-${i}`} className="border-t border-line first:border-0 md:[&:nth-child(2)]:border-0">
                  <Link href={`/ventas/${u.ventaId}`} className="flex items-center gap-3 py-2.5 hover:opacity-80">
                    <span className={u.grave ? "grid size-8 shrink-0 place-items-center rounded-full bg-bad-soft text-bad" : "grid size-8 shrink-0 place-items-center rounded-full bg-warn-soft text-warn"}><Icono className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate">{u.cliente}</strong>
                      <span className="block truncate text-[0.8rem] text-muted">{u.texto}{direccion ? ` · ${corto.get(u.vendedor) ?? ""}` : ""}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : <p className="text-sm text-muted">Todo al día: sin entregas en riesgo, expedientes detenidos, recibos faltantes ni postventa pendiente.</p>}
        {urgentes.length > 10 ? <p className="mt-2 text-[0.8rem] text-muted">Y {urgentes.length - 10} más en <Link href="/ventas?vista=abiertas" className="font-semibold text-accent hover:underline">Expedientes abiertos</Link>.</p> : null}
      </Tarjeta>

      {perfil.vende ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Indicador etiqueta={`Mis unidades de ${MESES[Number(mes.slice(5)) - 1]}`} valor={mio.unidades} nota={`Meta: ${miMeta} · proyección ${proyeccion(mio.unidades, diaHoy, diasDelMes(mes))}`} tono={mio.unidades >= miMeta ? "ok" : undefined} />
            <Indicador etiqueta="Faltan para la meta" valor={faltan} nota={faltan ? `${restantes} días restantes` : "Meta cumplida"} tono={faltan ? undefined : "ok"} />
            <Indicador etiqueta="Ritmo necesario" valor={decimal(ritmoNecesario(miMeta, mio.unidades, restantes))} nota="unidades por semana" />
            <Indicador etiqueta="Productos por unidad" valor={decimal(mio.productosPorUnidad)} nota={`${mio.totalProductos} productos vendidos`} />
          </div>
          <Tarjeta>
            <TituloTarjeta titulo="Tu avance del mes"><Pastilla tono={mio.unidades >= miMeta ? "ok" : "acc"}>{porcentaje(miMeta ? mio.unidades / miMeta : 0)} de la meta</Pastilla></TituloTarjeta>
            <div className="grid gap-2.5">
              <FilaBarra etiqueta="Unidades" valor={mio.unidades} max={Math.max(miMeta, mio.unidades, 1)} meta={miMeta} texto={<>{mio.unidades}<span className="font-normal text-muted"> / {miMeta}</span></>} />
              {cat.productos.map((p) => {
                const pc = penetracion(mio, p.id);
                return <FilaBarra key={p.id} etiqueta={<><span className="sm:hidden">{p.nombre_corto}</span><span className="max-sm:hidden">{p.nombre}</span></>} valor={pc} max={1} meta={metaProducto(s, metas, p.id) / 100} texto={<>{porcentaje(pc)}<span className="ml-1 font-normal text-muted">{mio.porProducto[p.id] ?? 0}</span></>} />;
              })}
            </div>
            <Leyenda />
          </Tarjeta>
        </>
      ) : null}

      {direccion ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Indicador etiqueta="Unidades del equipo" valor={totalEquipo} nota={`Meta del equipo: ${metaEquipo}`} tono={totalEquipo >= metaEquipo && metaEquipo ? "ok" : undefined} />
          <Indicador etiqueta="Cumplimiento" valor={porcentaje(metaEquipo ? totalEquipo / metaEquipo : 0)} nota={`Proyección: ${proyeccion(totalEquipo, diaHoy, diasDelMes(mes))} unidades`} />
          <Indicador etiqueta="Productos por unidad" valor={decimal(totalEquipo ? prodEquipo / totalEquipo : 0)} nota={`${prodEquipo} productos en ${nombreMes(mes)}`} />
          <Indicador etiqueta="Cortes de hoy" valor={`${vendedores.filter((v) => cortesHoy.has(v.id)).length}/${vendedores.length}`} nota="vendedores con corte capturado" />
        </div>
      ) : null}

      <Ranking filas={filas} titulo={`Ranking de ${nombreMes(mes)}`} />

      <div className="grid gap-5 lg:grid-cols-2">
        {mostrarSeguimientos ? (
          <Tarjeta>
            <TituloTarjeta titulo="Seguimientos para hoy"><BotonEnlace href="/crm" variante="secundario" tamano="sm">Abrir CRM</BotonEnlace></TituloTarjeta>
            {seguimientos.length ? (
              <ul className="grid grid-cols-[minmax(0,1fr)]">
                {seguimientos.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 border-t border-line py-2.5 first:border-0">
                    <div className="min-w-0 flex-1"><strong className="block truncate">{p.nombre}</strong><span className="block truncate text-[0.8rem] text-muted">{p.siguiente_accion || "Sin acción definida"}{p.modelo_id ? ` · ${nombreModelo.get(p.modelo_id) ?? ""}` : ""}</span></div>
                    <Pastilla tono="warn">{p.fecha_siguiente === fecha ? "Hoy" : `Vencido ${fechaCorta(p.fecha_siguiente)}`}</Pastilla>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">No tienes seguimientos vencidos. Agenda el siguiente contacto de cada prospecto en el CRM.</p>}
          </Tarjeta>
        ) : null}

        <Tarjeta>
          <TituloTarjeta titulo={direccion ? "Ventas en proceso del equipo" : "Tus ventas en proceso"} nota="Apartadas y facturadas" />
          {enProceso.length ? (
            <ul className="grid grid-cols-[minmax(0,1fr)]">
              {enProceso.slice(0, 6).map((v) => {
                const av = procesoDeVenta(v, cat.productos);
                return (
                  <li key={v.id} className="border-t border-line first:border-0">
                    <Link href={`/ventas/${v.id}`} className="flex items-center gap-3 py-2.5 hover:opacity-80">
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate">{v.cliente}</strong>
                        <span className="block truncate text-[0.8rem] text-muted">Sigue: {av.siguiente?.label ?? "Listo"}{direccion ? ` · ${corto.get(v.vendedor_id) ?? ""}` : ""}</span>
                        <Progreso valor={av.pct} className="mt-1.5 h-1.5" />
                      </div>
                      <span className="text-[0.8rem] font-semibold tabular-nums text-muted">{av.hechos}/{av.total}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-sm text-muted">No hay ventas abiertas. Las ventas apartadas o facturadas aparecen aquí con su siguiente paso.</p>}
        </Tarjeta>

        <Tarjeta className={mostrarSeguimientos ? "lg:col-span-2" : ""}>
          <TituloTarjeta titulo={direccion ? "Últimas ventas del equipo" : "Tus últimas ventas"}><BotonEnlace href="/ventas" variante="secundario" tamano="sm">Ver todas</BotonEnlace></TituloTarjeta>
          {recientes.length ? (
            <ul className="grid gap-x-6 sm:grid-cols-2">
              {recientes.map((v) => (
                <li key={v.id} className="border-t border-line">
                  <Link href={`/ventas/${v.id}`} className="flex items-center gap-3 py-2.5 hover:opacity-80">
                    <MuestraColor hex={colorHex(v.color)} />
                    <div className="min-w-0 flex-1"><strong className="block truncate">{v.cliente}</strong><span className="block truncate text-[0.8rem] text-muted">{nombreModelo.get(v.modelo_id) ?? ""} · {v.color}{direccion ? ` · ${corto.get(v.vendedor_id) ?? ""}` : ""}</span></div>
                    <Pastilla tono="acc">{v.productos.length} prod.</Pastilla>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">Todavía no hay ventas. Usa “Registrar venta” con VIN, número de cliente, modelo, color y productos.</p>}
        </Tarjeta>
      </div>
    </>
  );
}
