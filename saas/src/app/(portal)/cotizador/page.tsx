import { catalogo } from "@/lib/datos";
import { requerirSesion } from "@/lib/sesion";
import { Encabezado } from "@/components/ui";
import { Cotizador } from "./cotizador";

export const metadata = { title: "Cotizador" };

export default async function PaginaCotizador() {
  const s = await requerirSesion();
  const { modelos } = await catalogo(s);
  const pa = s.agencia.parametros;
  return (
    <>
      <Encabezado eyebrow="Vender" titulo="Cotizador" descripcion="Fórmulas Banorte Plan Tradicional. El bono flexible solo aplica financiando desde 5% de enganche. Los precios y bonos se actualizan en Catálogo." />
      <Cotizador
        modelos={modelos.map((m) => ({ id: m.id, clave: m.clave, nombre: m.nombre, anio: m.anio, motor: m.motor, precio: m.precio, bono: m.bono, descripcion: m.descripcion }))}
        parametros={{ placasElectrico: pa.placas_electrico ?? 1760, placasHibrido: pa.placas_hibrido ?? 5866, gestoria: pa.gestoria ?? 3016, garantia: pa.garantia_extendida ?? 9082, separacion: pa.separacion ?? 5000 }}
        asesor={s.perfil.rol === "ceo" ? "BYD Park Point" : s.perfil.nombre_corto}
      />
    </>
  );
}
