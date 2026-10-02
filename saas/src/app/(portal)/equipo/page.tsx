import { cortesDelDia, equipo, metaUnidades, metasDelMes, progresoAcademia, ranking } from "@/lib/datos";
import { requerirDireccion } from "@/lib/sesion";
import { hoy, mesActual, nombreMes } from "@/lib/dominio/fechas";
import { MODULOS, moduloAprobado } from "@/lib/academia";
import { Aviso, Encabezado } from "@/components/ui";
import { ListaEquipo } from "./lista";

export const metadata = { title: "Equipo" };

export default async function Equipo() {
  const s = await requerirDireccion();
  const mes = mesActual();
  const [eq, filas, metas, cortes, academia] = await Promise.all([equipo(s), ranking(s, mes), metasDelMes(s, mes), cortesDelDia(s, hoy()), progresoAcademia(s)]);
  const rk = new Map(filas.map((f) => [f.vendedor_id, f]));
  const conCorte = new Set(cortes.map((c) => c.usuario_id));
  const acad = new Map(academia.map((a) => [a.usuario_id, a]));
  const modulosHechos = (uid: string) => {
    const a = acad.get(uid);
    if (!a) return 0;
    return MODULOS.filter((m) => moduloAprobado(m, a.respuestas).aprobado).length;
  };
  return (
    <>
      <Encabezado eyebrow="Dirección" titulo="Equipo" descripcion={`Quién es quién, cómo va cada uno en ${nombreMes(mes)} y su acceso al portal.`} />
      <ListaEquipo
        yo={{ id: s.perfil.id, rol: s.perfil.rol }}
        personas={eq.map((p) => ({
          ...p,
          unidades: rk.get(p.id)?.unidades ?? 0,
          productos: rk.get(p.id)?.productos ?? 0,
          meta: p.vende ? metaUnidades(s, metas, p.id) : null,
          corteHoy: conCorte.has(p.id),
          academia: `${modulosHechos(p.id)}/${MODULOS.length}`,
        }))}
      />
      <Aviso>Los asesores solo ven sus propias ventas, prospectos y cortes; dirección (CEO y gerente) ve todo. Los permisos se aplican en la base de datos, no solo en la pantalla.</Aviso>
    </>
  );
}
