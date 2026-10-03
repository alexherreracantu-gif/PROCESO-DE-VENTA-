import { requerirSesion } from "@/lib/sesion";
import { catalogo } from "@/lib/datos";
import { hoy } from "@/lib/dominio/fechas";
import { FOTOS_INCLUIDAS } from "@/lib/fotos-incluidas";
import { Encabezado } from "@/components/ui";
import { Generador, type ModeloGenerador } from "./generador";

export const metadata = { title: "Generador de anuncios" };

export default async function Anuncios(props: PageProps<"/anuncios">) {
  const s = await requerirSesion();
  const { modelo } = await props.searchParams;
  const [cat, { data }] = await Promise.all([catalogo(s), s.sb.from("modelo_fotos").select("modelo_id, posicion, updated_at")]);
  const fotos = (data ?? []) as { modelo_id: string; posicion: number; updated_at: string }[];
  const modelos: ModeloGenerador[] = cat.modelos.map((m) => ({
    id: m.id, clave: m.clave, nombre: m.nombre, anio: m.anio, motor: m.motor, precio: m.precio, bono: m.bono, descripcion: m.descripcion,
    fotos: Object.fromEntries(fotos.filter((f) => f.modelo_id === m.id).map((f) => [f.posicion, new Date(f.updated_at).getTime()])),
    incluidas: FOTOS_INCLUIDAS[m.clave] ?? {},
  }));
  const inicial = typeof modelo === "string" && modelos.some((m) => m.clave === modelo) ? modelo : (modelos.find((m) => m.clave === "king-gl") ?? modelos[0])?.clave;
  return (
    <>
      <Encabezado eyebrow="Vender" titulo="Generador de anuncios"
        descripcion="Elige modelo, foto y diseño: el anuncio sale con la oferta del mes, tus datos y la letra chica. Descárgalo o compártelo, y copia el texto para Facebook, Instagram o WhatsApp." />
      {modelos.length && inicial ? (
        <Generador modelos={modelos} inicial={inicial} hoy={hoy()}
          asesor={{ nombre: s.perfil.rol === "ceo" ? "" : s.perfil.nombre, telefono: s.perfil.telefono ?? "" }}
          agencia={{ nombre: s.agencia.nombre, ciudad: s.agencia.ciudad ?? "Monterrey, N.L." }} />
      ) : <p className="text-muted">No hay modelos a la venta en el catálogo.</p>}
    </>
  );
}
