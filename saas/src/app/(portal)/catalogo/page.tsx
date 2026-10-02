import { catalogo } from "@/lib/datos";
import { requerirDireccion } from "@/lib/sesion";
import { Encabezado } from "@/components/ui";
import { EditorCatalogo } from "./editor";

export const metadata = { title: "Catálogo y precios" };

export default async function Catalogo() {
  const s = await requerirDireccion();
  const { modelos, productos } = await catalogo(s, true);
  return (
    <>
      <Encabezado eyebrow="Dirección" titulo="Catálogo y precios" descripcion="Actualiza precios y bonos cada mes. Los cambios aplican de inmediato en el cotizador y en las ventas nuevas; las ventas ya registradas no cambian." />
      <EditorCatalogo modelos={modelos} productos={productos} parametros={s.agencia.parametros} />
    </>
  );
}
