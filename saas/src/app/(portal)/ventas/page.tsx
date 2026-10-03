import { contextoVenta, ventasDelMes, ventasEnProceso } from "@/lib/datos";
import { procesoDeVenta } from "@/lib/dominio/proceso";
import { textoSaldo } from "@/lib/dominio/seguimiento";
import { requerirSesion } from "@/lib/sesion";
import { esMes, mesActual, nombreMes } from "@/lib/dominio/fechas";
import { DatabaseBackup } from "lucide-react";
import { claseBoton, Encabezado, Segmentos } from "@/components/ui";
import { ListaVentas } from "./lista";
import { SelectorMes } from "@/components/selector-mes";

export const metadata = { title: "Ventas" };

export default async function Ventas(props: PageProps<"/ventas">) {
  const s = await requerirSesion();
  const sp = await props.searchParams;
  const mes = esMes(sp.mes as string) ? (sp.mes as string) : mesActual();
  const vendedor = s.direccion && typeof sp.vendedor === "string" && sp.vendedor !== "todos" ? sp.vendedor : null;
  const abiertas = sp.vista === "abiertas";
  const [ctx, ventas] = await Promise.all([
    contextoVenta(s),
    abiertas ? ventasEnProceso(s).then((l) => (vendedor ? l.filter((v) => v.vendedor_id === vendedor) : l)) : ventasDelMes(s, mes, vendedor),
  ]);
  const { catalogo, equipo, ...ctxFormulario } = ctx;
  const enlace = (v: string) => `/ventas?${abiertas ? "vista=abiertas" : `mes=${mes}`}${v !== "todos" ? `&vendedor=${v}` : ""}`;
  const vista = (x: string) => `/ventas?${x === "abiertas" ? "vista=abiertas" : `mes=${mes}`}${vendedor ? `&vendedor=${vendedor}` : ""}`;
  // Avance del expediente y saldo de cada venta, para la lista.
  const avances = Object.fromEntries(ventas.map((v) => {
    const p = procesoDeVenta(v, catalogo.productos);
    return [v.id, { pct: p.pct, hechos: p.hechos, total: p.total, siguiente: p.siguiente?.label ?? null, saldo: textoSaldo(v.forma_pago, p.cuenta) }];
  }));

  return (
    <>
      <Encabezado eyebrow="Operación" titulo="Ventas"
        descripcion={`${s.direccion ? "Todas las unidades del equipo" : "Tus unidades"}: cada una con su expediente de la aprobación a la hoja de salida, sus pagos y su saldo.`}>
        <a href="/api/respaldo" className={claseBoton("secundario", "md")} title="Ventas, pagos, documentos y prospectos en Excel (CSV)"><DatabaseBackup className="size-4" aria-hidden />Respaldo</a>
      </Encabezado>
      <div className="flex flex-wrap items-center gap-3">
        <Segmentos etiqueta="Vista" actual={abiertas ? "abiertas" : "mes"}
          opciones={[{ valor: "mes", texto: "Por mes", href: vista("mes") }, { valor: "abiertas", texto: "Expedientes abiertos", href: vista("abiertas") }]} />
        {abiertas ? null : <SelectorMes mes={mes} base="/ventas" extra={vendedor ? { vendedor } : undefined} />}
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
        mesTexto={abiertas ? "proceso" : nombreMes(mes)}
        abiertas={abiertas}
        avances={avances}
        abrirNueva={sp.nueva === "1"}
      />
    </>
  );
}
