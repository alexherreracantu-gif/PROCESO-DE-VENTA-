import { catalogo, equipo, metaProducto, metaUnidades, metasDelMes, ranking, ventasDelMes } from "@/lib/datos";
import { requerirSesion } from "@/lib/sesion";
import { KPIS_LUNES, ROLES } from "@/lib/dominio/catalogos";
import { diasRestantes, esMes, mesActual, nombreMes } from "@/lib/dominio/fechas";
import { penetracion, resumir } from "@/lib/dominio/reportes";
import { Aviso, Encabezado, Tabla, Tarjeta, TituloTarjeta } from "@/components/ui";
import { SelectorMes } from "@/components/selector-mes";
import { EditorMetas } from "./editor";

export const metadata = { title: "Objetivos" };

export default async function Objetivos(props: PageProps<"/objetivos">) {
  const s = await requerirSesion();
  const sp = await props.searchParams;
  const mes = esMes(sp.mes as string) ? (sp.mes as string) : mesActual();
  const [cat, eq, metas, filas, ventas] = await Promise.all([
    catalogo(s), equipo(s), metasDelMes(s, mes), ranking(s, mes),
    s.direccion || s.perfil.vende ? ventasDelMes(s, mes, s.direccion ? null : s.perfil.id) : Promise.resolve([]),
  ]);
  const vendidas = new Map(filas.map((f) => [f.vendedor_id, f.unidades]));
  const r = resumir(ventas, cat.productos);
  const pa = s.agencia.parametros;

  return (
    <>
      <Encabezado eyebrow="Objetivos Park Point" titulo={nombreMes(mes).replace(/^./, (c) => c.toUpperCase())}
        descripcion={s.direccion ? "Define la meta de unidades de cada vendedor y la meta de penetración de cada producto. Todo el equipo ve su avance en vivo." : "Tus metas del mes y el avance del equipo. Las define dirección."}>
        <SelectorMes mes={mes} base="/objetivos" />
      </Encabezado>
      {!metas.guardadas ? <Aviso>Este mes usa las metas iniciales: {pa.meta_unidades ?? 14} unidades por vendedor y {pa.meta_producto ?? 50}% en cada producto.{s.direccion ? " Ajústalas y guarda." : ""}</Aviso> : null}
      <EditorMetas
        key={mes + JSON.stringify(metas)}
        mes={mes} mesTexto={nombreMes(mes)} editable={s.direccion} mesActual={mes === mesActual()} diasRestantes={diasRestantes(mes)}
        etiquetaReal={s.direccion ? "Real del equipo" : "Tu real"}
        vendedores={eq.filter((p) => p.vende && p.activo).map((p) => ({ id: p.id, nombre: p.nombre, rol: ROLES[p.rol], vendidas: vendidas.get(p.id) ?? 0, meta: metaUnidades(s, metas, p.id), yo: p.id === s.perfil.id }))}
        productos={cat.productos.map((p) => ({ id: p.id, nombre: p.nombre, real: s.direccion || s.perfil.vende ? penetracion(r, p.id) : null, meta: metaProducto(s, metas, p.id) }))}
      />
      <Tarjeta>
        <TituloTarjeta titulo="KPIs de cada lunes" nota="Meta semanal por asesor" />
        <Tabla><tbody>{KPIS_LUNES.map(([k, v]) => <tr key={k}><td>{k}</td><td className="text-right font-semibold">{v}</td></tr>)}</tbody></Tabla>
        <p className="mt-3 text-[0.82rem] text-muted">Regla del lunes: el número más lejos de su meta es la única prioridad de la semana.</p>
      </Tarjeta>
    </>
  );
}
