import { contextoVenta, ventasDelMes } from "@/lib/datos";
import { requerirSesion } from "@/lib/sesion";
import { esMes, mesActual, nombreMes } from "@/lib/dominio/fechas";
import { Encabezado, Segmentos } from "@/components/ui";
import { ListaVentas } from "./lista";
import { SelectorMes } from "@/components/selector-mes";

export const metadata = { title: "Ventas" };

export default async function Ventas(props: PageProps<"/ventas">) {
  const s = await requerirSesion();
  const sp = await props.searchParams;
  const mes = esMes(sp.mes as string) ? (sp.mes as string) : mesActual();
  const vendedor = s.direccion && typeof sp.vendedor === "string" && sp.vendedor !== "todos" ? sp.vendedor : null;
  const [ctx, ventas] = await Promise.all([contextoVenta(s), ventasDelMes(s, mes, vendedor)]);
  const { catalogo, equipo, ...ctxFormulario } = ctx;
  const enlace = (v: string) => `/ventas?mes=${mes}${v !== "todos" ? `&vendedor=${v}` : ""}`;

  return (
    <>
      <Encabezado eyebrow="Operación" titulo="Ventas"
        descripcion={s.direccion ? "Todas las unidades del equipo con VIN, número de cliente, modelo, color y productos vendidos." : "Tus unidades con VIN, número de cliente, modelo, color y productos vendidos."} />
      <div className="flex flex-wrap items-center gap-3">
        <SelectorMes mes={mes} base="/ventas" extra={vendedor ? { vendedor } : undefined} />
        {s.direccion ? (
          <Segmentos etiqueta="Vendedor" actual={vendedor ?? "todos"}
            opciones={[{ valor: "todos", texto: "Equipo", href: enlace("todos") }, ...ctx.vendedores.map((v) => ({ valor: v.id, texto: equipo.find((p) => p.id === v.id)?.nombre_corto ?? v.nombre, href: enlace(v.id) }))]} />
        ) : null}
      </div>
      <ListaVentas
        ventas={ventas}
        ctx={ctxFormulario}
        modelos={catalogo.modelos.map((m) => ({ id: m.id, nombre: `${m.nombre} ${m.anio}` }))}
        productos={catalogo.productos.map((p) => ({ id: p.id, nombre: p.nombre, corto: p.nombre_corto }))}
        nombres={Object.fromEntries(equipo.map((p) => [p.id, p.nombre_corto]))}
        mesTexto={nombreMes(mes)}
        abrirNueva={sp.nueva === "1"}
      />
    </>
  );
}
