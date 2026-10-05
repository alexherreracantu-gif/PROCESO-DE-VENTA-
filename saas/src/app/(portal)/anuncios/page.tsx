import { requerirSesion } from "@/lib/sesion";
import { catalogo } from "@/lib/datos";
import { hoy, mesActual, nombreMes, rangoMes } from "@/lib/dominio/fechas";
import { ANUNCIOS_INCLUIDOS, rutaIncluida } from "@/lib/anuncios-oficiales";
import { AnunciosOficiales, type Pieza } from "./oficiales";
import { FOTOS_INCLUIDAS } from "@/lib/fotos-incluidas";
import { Encabezado } from "@/components/ui";
import { Generador, type ModeloGenerador } from "./generador";

export const metadata = { title: "Generador de anuncios" };

export default async function Anuncios(props: PageProps<"/anuncios">) {
  const s = await requerirSesion();
  const { modelo } = await props.searchParams;
  const mes = mesActual();
  const [cat, { data }, oficiales] = await Promise.all([
    catalogo(s), s.sb.from("modelo_fotos").select("modelo_id, posicion, updated_at"),
    s.sb.from("anuncios_oficiales").select("id, titulo, modelo_id, created_at").eq("mes", rangoMes(mes).desde).order("orden").order("created_at"),
  ]);
  const fotos = (data ?? []) as { modelo_id: string; posicion: number; updated_at: string }[];
  const modelos: ModeloGenerador[] = cat.modelos.map((m) => ({
    id: m.id, clave: m.clave, nombre: m.nombre, anio: m.anio, motor: m.motor, precio: m.precio, bono: m.bono, descripcion: m.descripcion, autonomia: m.autonomia, campana: m.campana,
    fotos: Object.fromEntries(fotos.filter((f) => f.modelo_id === m.id).map((f) => [f.posicion, new Date(f.updated_at).getTime()])),
    incluidas: FOTOS_INCLUIDAS[m.clave] ?? {},
  }));
  const claveDe = new Map(cat.modelos.map((m) => [m.id, m.clave]));
  const piezas: Pieza[] = [
    ...(ANUNCIOS_INCLUIDOS[mes] ?? []).map((p) => ({ id: `incluida-${p.archivo}`, titulo: p.titulo, grande: rutaIncluida(mes, p.archivo), mini: rutaIncluida(mes, p.archivo, true), clave: p.clave, propia: false })),
    ...((oficiales.data ?? []) as { id: string; titulo: string; modelo_id: string | null }[]).map((p) => ({
      id: p.id, titulo: p.titulo, grande: `/api/anuncios-oficiales/${p.id}`, mini: `/api/anuncios-oficiales/${p.id}?t=mini`, clave: p.modelo_id ? claveDe.get(p.modelo_id) ?? null : null, propia: true,
    })),
  ];
  const inicial = typeof modelo === "string" && modelos.some((m) => m.clave === modelo) ? modelo : (modelos.find((m) => m.clave === "king-gl") ?? modelos[0])?.clave;
  return (
    <>
      <Encabezado eyebrow="Vender" titulo="Generador de anuncios"
        descripcion="Los anuncios oficiales de la campaña listos para publicar, o crea el tuyo: elige modelo, foto y diseño y sale con la oferta del mes, tus datos y la letra chica." />
      <AnunciosOficiales piezas={piezas} mes={mes} mesTexto={nombreMes(mes)} direccion={s.direccion} modelos={cat.modelos.map((m) => ({ id: m.id, clave: m.clave, nombre: `${m.nombre} ${m.anio}` }))} />
      <h2 id="generador" className="scroll-mt-20 font-display text-[1.6rem] font-semibold leading-none">Crea el tuyo con tus datos</h2>
      {modelos.length && inicial ? (
        <Generador key={inicial} modelos={modelos} inicial={inicial} hoy={hoy()}
          asesor={{ nombre: s.perfil.rol === "ceo" ? "" : s.perfil.nombre, telefono: s.perfil.telefono ?? "" }}
          agencia={{ nombre: s.agencia.nombre, ciudad: s.agencia.ciudad ?? "Monterrey, N.L." }} />
      ) : <p className="text-muted">No hay modelos a la venta en el catálogo.</p>}
    </>
  );
}
