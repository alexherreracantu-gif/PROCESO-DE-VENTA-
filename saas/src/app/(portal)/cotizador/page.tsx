import { catalogo, equipo } from "@/lib/datos";
import { requerirSesion } from "@/lib/sesion";
import { ROLES } from "@/lib/dominio/catalogos";
import { hoy } from "@/lib/dominio/fechas";
import { vigencia } from "@/lib/anuncios";
import { FOTOS_INCLUIDAS } from "@/lib/fotos-incluidas";
import { Encabezado } from "@/components/ui";
import { Cotizador } from "./cotizador";

export const metadata = { title: "Cotizador" };

export default async function PaginaCotizador() {
  const s = await requerirSesion();
  const [{ modelos, productos }, eq] = await Promise.all([catalogo(s), equipo(s)]);
  const pa = s.agencia.parametros;
  const vendedores = eq.filter((p) => p.vende && p.activo).map((p) => ({ id: p.id, nombre: p.nombre, titulo: p.rol === "asesor" ? "Asesor comercial" : ROLES[p.rol] }));
  return (
    <>
      <Encabezado eyebrow="Herramienta comercial" titulo="Cotizador BYD"
        descripcion="Cotiza en tres pasos con las fórmulas de Banorte (Plan Tradicional) y confirma los importes en Banorte. Precios y bonos del catálogo del mes." />
      <Cotizador
        modelos={modelos.map((m) => {
          const f = FOTOS_INCLUIDAS[m.clave]?.[1];
          return { id: m.id, clave: m.clave, nombre: m.nombre, anio: m.anio, motor: m.motor, precio: m.precio, bono: m.bono, descripcion: m.descripcion, mini: f ? `/modelos/${f}-mini.jpg` : null, mensualidadDesde: m.campana?.mensualidad ?? null,
            banorte: { submarca: m.banorte_submarca, anio: m.banorte_anio, modelo: m.banorte_modelo } };
        })}
        extras={productos.filter((p) => p.activo && p.precio && p.clave !== "placas").map((p) => ({ clave: p.clave, nombre: p.clave === "accesorios" ? "Kit de accesorios" : p.nombre, precio: p.precio as number }))
          .sort((a, b) => (a.clave === "wallbox" ? -1 : b.clave === "wallbox" ? 1 : 0))}
        parametros={{ placasElectrico: pa.placas_electrico ?? 1760, placasHibrido: pa.placas_hibrido ?? 5866, gestoria: pa.gestoria ?? 3016 }}
        vendedores={vendedores.length ? vendedores : [{ id: s.perfil.id, nombre: s.perfil.nombre, titulo: ROLES[s.perfil.rol] }]}
        yo={s.perfil.id}
        direccion={s.direccion}
        usuario={s.perfil.usuario}
        vigencia={vigencia(hoy())}
      />
    </>
  );
}
