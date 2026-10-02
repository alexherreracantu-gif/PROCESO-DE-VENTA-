import { contextoVenta, prospectos } from "@/lib/datos";
import { requerirSesion } from "@/lib/sesion";
import { hoy } from "@/lib/dominio/fechas";
import { Encabezado, Segmentos } from "@/components/ui";
import { TableroCrm } from "./tablero";

export const metadata = { title: "Prospectos" };

export default async function Crm(props: PageProps<"/crm">) {
  const s = await requerirSesion();
  const sp = await props.searchParams;
  const asesor = s.direccion ? (typeof sp.asesor === "string" && sp.asesor !== "todos" ? sp.asesor : null) : s.perfil.id;
  const [ctx, lista] = await Promise.all([contextoVenta(s), prospectos(s, asesor)]);
  const { catalogo, equipo, ...ctxFormulario } = ctx;
  const enlace = (v: string) => `/crm${v !== "todos" ? `?asesor=${v}` : ""}`;
  return (
    <>
      <Encabezado eyebrow="Vender" titulo="Prospectos" descripcion="De Nuevo a Referidor. Cada prospecto con su siguiente acción y fecha. Seguimiento con razón, nunca “¿sigues interesado?”." />
      {s.direccion ? <Segmentos etiqueta="Asesor" actual={asesor ?? "todos"} opciones={[{ valor: "todos", texto: "Equipo", href: enlace("todos") }, ...ctx.vendedores.map((v) => ({ valor: v.id, texto: equipo.find((p) => p.id === v.id)?.nombre_corto ?? v.nombre, href: enlace(v.id) }))]} /> : null}
      <TableroCrm prospectos={lista} ctx={ctxFormulario} hoy={hoy()}
        modelos={catalogo.modelos.filter((m) => m.activo).map((m) => ({ id: m.id, nombre: `${m.nombre} ${m.anio}` }))}
        nombres={Object.fromEntries(equipo.map((p) => [p.id, p.nombre_corto]))} />
    </>
  );
}
