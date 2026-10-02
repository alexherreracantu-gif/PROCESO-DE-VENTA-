import { requerirSesion } from "@/lib/sesion";
import { catalogo } from "@/lib/datos";
import { Encabezado } from "@/components/ui";
import { FOTOS_INCLUIDAS } from "@/lib/fotos-incluidas";
import { Galeria, type ModeloGaleria } from "./galeria";

export const metadata = { title: "Fotos de modelos" };

export default async function Fotos() {
  const s = await requerirSesion();
  const [cat, { data }] = await Promise.all([
    catalogo(s),
    s.sb.from("modelo_fotos").select("modelo_id, posicion, updated_at"),
  ]);
  const fotos = (data ?? []) as { modelo_id: string; posicion: number; updated_at: string }[];
  const modelos: ModeloGaleria[] = cat.modelos.map((m) => ({
    id: m.id, clave: m.clave, nombre: `${m.nombre} ${m.anio}`, precio: m.precio, bono: m.bono,
    fotos: Object.fromEntries(fotos.filter((f) => f.modelo_id === m.id).map((f) => [f.posicion, new Date(f.updated_at).getTime()])),
    incluidas: FOTOS_INCLUIDAS[m.clave] ?? {},
  }));
  const conFotos = modelos.filter((m) => Object.keys(m.fotos).length || Object.keys(m.incluidas).length).length;
  return (
    <>
      <Encabezado eyebrow="Vender" titulo="Fotos de modelos"
        descripcion={s.direccion
          ? `3 de exterior y 1 de interior por modelo. Ya vienen las fotos de BYD; si subes una propia en un espacio, se usa esa. ${conFotos} de ${modelos.length} modelos tienen fotos.`
          : "3 de exterior y 1 de interior por modelo. Toca Enviar al cliente: en el celular se abre WhatsApp con las 4 fotos."} />
      <Galeria modelos={modelos} editar={s.direccion} />
    </>
  );
}
