import Link from "next/link";
import { catalogo, equipo, metaUnidades, metasDelMes, ventasDelMes } from "@/lib/datos";
import { requerirSesion } from "@/lib/sesion";
import { estatusInfo } from "@/lib/dominio/catalogos";
import { esMes, fechaCorta, mesActual, nombreMes } from "@/lib/dominio/fechas";
import { dinero, porcentaje } from "@/lib/dominio/formato";
import { comisionVenta, esquemaVacio } from "@/lib/dominio/seguimiento";
import { Aviso, Encabezado, FilaBarra, Indicador, Pastilla, Segmentos, Tabla, Tarjeta, TituloTarjeta, Vacio } from "@/components/ui";
import { SelectorMes } from "@/components/selector-mes";
import { FormEsquema, FormMeta } from "./formularios";

export const metadata = { title: "Comisiones" };

export default async function Comisiones(props: PageProps<"/comisiones">) {
  const s = await requerirSesion();
  const sp = await props.searchParams;
  const mes = esMes(sp.mes as string) ? (sp.mes as string) : mesActual();
  const [cat, eq, metas] = await Promise.all([catalogo(s, true), equipo(s), metasDelMes(s, mes)]);
  const vendedores = eq.filter((p) => p.vende && p.activo);
  const elegido = s.direccion && typeof sp.vendedor === "string" && vendedores.some((v) => v.id === sp.vendedor) ? sp.vendedor : s.perfil.vende ? s.perfil.id : vendedores[0]?.id;
  const persona = eq.find((p) => p.id === elegido);
  const ventas = elegido ? await ventasDelMes(s, mes, elegido) : [];
  const esquema = s.agencia.parametros.comisiones ?? {};
  const vacio = esquemaVacio(esquema);

  const filas = ventas.filter((v) => v.estatus !== "cancelada").map((v) => ({ v, c: comisionVenta(esquema, v, cat.productos) }));
  const ganado = filas.filter((x) => x.v.estatus === "entregada").reduce((t, x) => t + x.c.total, 0);
  const porCobrar = filas.filter((x) => x.v.estatus !== "entregada").reduce((t, x) => t + x.c.total, 0);
  const unidades = filas.length;
  const metaU = elegido ? metaUnidades(s, metas, elegido) : 0;
  const bono = esquema.bono_meta && unidades >= metaU && metaU > 0 ? esquema.bono_meta : 0;
  const total = ganado + porCobrar + bono;
  const promedio = unidades ? (ganado + porCobrar) / unidades : 0;
  const metaIngreso = elegido ? esquema.metas?.[elegido] ?? null : null;
  const faltaIngreso = metaIngreso ? Math.max(metaIngreso - total, 0) : 0;
  const ventasFaltan = faltaIngreso && promedio ? Math.ceil(faltaIngreso / promedio) : null;
  const enlace = (q: Record<string, string>) => `/comisiones?${new URLSearchParams({ mes, ...(elegido ? { vendedor: elegido } : {}), ...q })}`;
  const modelo = new Map(cat.modelos.map((m) => [m.id, `${m.nombre} ${m.anio}`]));

  return (
    <>
      <Encabezado eyebrow="Tu dinero" titulo={s.direccion && persona && persona.id !== s.perfil.id ? `Comisiones de ${persona.nombre_corto}` : "Mis comisiones"}
        descripcion="Lo que ganas por cada venta del mes: unidad, productos y bono por meta. Lo entregado ya está ganado; lo apartado y facturado está por cobrar." />
      <div className="flex flex-wrap items-center gap-3">
        <SelectorMes mes={mes} base="/comisiones" extra={elegido ? { vendedor: elegido } : undefined} />
        {s.direccion ? <Segmentos etiqueta="Vendedor" actual={elegido ?? ""} opciones={vendedores.map((v) => ({ valor: v.id, texto: v.nombre_corto, href: enlace({ vendedor: v.id }) }))} /> : null}
      </div>

      {vacio ? (
        <Aviso tono="warn">
          {s.direccion ? "Captura abajo cómo se pagan las comisiones (por unidad y por producto) y el portal las calcula solo en cada venta." : "Todavía no está capturado el esquema de comisiones. Pídele a tu gerente que lo llene en esta misma pantalla."}
        </Aviso>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador etiqueta="Total del mes" valor={dinero(total)} nota={`${unidades} ${unidades === 1 ? "unidad" : "unidades"} · ${nombreMes(mes)}`} />
        <Indicador etiqueta="Ganado (entregadas)" valor={dinero(ganado)} tono={ganado ? "ok" : undefined} nota={`${filas.filter((x) => x.v.estatus === "entregada").length} entregadas`} />
        <Indicador etiqueta="Por cobrar" valor={dinero(porCobrar)} nota="Apartadas y facturadas" tono={porCobrar ? "warn" : undefined} />
        <Indicador etiqueta="Bono por meta" valor={dinero(bono)} tono={bono ? "ok" : undefined} nota={esquema.bono_meta ? `${unidades}/${metaU} unidades${bono ? " · ¡cumplida!" : ` · faltan ${Math.max(metaU - unidades, 0)}`}` : "Sin bono capturado"} />
      </div>

      {elegido === s.perfil.id ? (
        <Tarjeta>
          <TituloTarjeta titulo="Tu meta de ingreso" nota={metaIngreso ? `${porcentaje(total / metaIngreso)} de ${dinero(metaIngreso)}` : "Ponte una meta y el portal te dice cuántas ventas te faltan"} />
          {metaIngreso ? (
            <div className="mb-4 grid gap-2">
              <FilaBarra etiqueta="Ingreso" valor={total} max={Math.max(metaIngreso, total, 1)} meta={metaIngreso} texto={dinero(total)} />
              <p className="text-[0.88rem]">
                {faltaIngreso ? <>Te faltan <strong>{dinero(faltaIngreso)}</strong>{ventasFaltan ? <> · aprox. <strong>{ventasFaltan} {ventasFaltan === 1 ? "venta" : "ventas"}</strong> con tu promedio de {dinero(promedio)} por venta</> : null}.</> : <strong className="text-ok">¡Meta de ingreso cumplida! 🎉</strong>}
              </p>
            </div>
          ) : null}
          <FormMeta meta={metaIngreso} />
        </Tarjeta>
      ) : null}

      <Tarjeta>
        <TituloTarjeta titulo="Comisión por venta" nota={`Promedio ${dinero(promedio)} por unidad`} />
        {filas.length ? (
          <Tabla>
            <thead><tr><th>Venta</th><th>Cliente</th><th>Estatus</th><th className="text-right!">Unidad</th><th>Productos</th><th className="text-right!">Total</th></tr></thead>
            <tbody>
              {filas.map(({ v, c }) => (
                <tr key={v.id}>
                  <td className="whitespace-nowrap"><Link href={`/ventas/${v.id}`} className="font-semibold text-accent hover:underline">#{v.folio}</Link> <span className="text-muted">{fechaCorta(v.fecha)}</span></td>
                  <td className="min-w-[160px]"><strong className="block">{v.cliente}</strong><span className="text-[0.78rem] text-muted">{modelo.get(v.modelo_id)}</span></td>
                  <td><Pastilla tono={estatusInfo(v.estatus).tono}>{estatusInfo(v.estatus).label}</Pastilla></td>
                  <td className="text-right">{dinero(c.unidad)}</td>
                  <td className="text-[0.8rem] text-muted">{c.productos.length ? c.productos.map((x) => `${x.nombre} ${dinero(x.monto)}`).join(" · ") : "—"}</td>
                  <td className="text-right font-semibold">{dinero(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        ) : <Vacio titulo={`Sin ventas en ${nombreMes(mes)}`}>Cada venta que registres aparece aquí con su comisión.</Vacio>}
      </Tarjeta>

      {s.direccion ? (
        <Tarjeta>
          <TituloTarjeta titulo="Esquema de comisiones" nota="Solo dirección lo cambia · aplica a todo el equipo" />
          <FormEsquema esquema={esquema} productos={cat.productos.filter((p) => p.activo).map((p) => ({ clave: p.clave, nombre: p.nombre, precio: p.precio }))} />
        </Tarjeta>
      ) : null}
    </>
  );
}
