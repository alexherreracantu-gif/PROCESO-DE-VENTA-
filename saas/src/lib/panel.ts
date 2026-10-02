import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Sesion } from "@/lib/sesion";
import type { Agencia } from "@/lib/tipos";

/**
 * "Sesión" de solo lectura para el dashboard general (/panel), que se abre sin usuario.
 * Usa el cliente de servicio, así que solo debe pasarse a lecturas que filtran por agencia
 * (equipo, catálogo, ventas del mes y metas). Nunca para escribir.
 */
export async function sesionPanel(): Promise<Sesion | null> {
  const sb = supabaseAdmin();
  const { data: agencia } = await sb.from("agencias").select("id, nombre, marca, grupo, ciudad, parametros")
    .order("created_at").limit(1).maybeSingle<Agencia>();
  if (!agencia) return null;
  return {
    sb: sb as unknown as Sesion["sb"],
    agencia,
    direccion: true,
    perfil: { id: "", agencia_id: agencia.id, usuario: "panel", nombre: "Dashboard general", nombre_corto: "Dashboard", rol: "gerente", vende: false, activo: true, telefono: null },
  };
}
