import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { esDireccion } from "@/lib/dominio/catalogos";
import type { Agencia, Perfil } from "@/lib/tipos";

export type Sesion = {
  sb: Awaited<ReturnType<typeof supabaseServidor>>;
  perfil: Perfil;
  agencia: Agencia;
  direccion: boolean;
};

/** Sesión de la petición actual (se calcula una vez por render). */
export const obtenerSesion = cache(async (): Promise<Sesion | null> => {
  const sb = await supabaseServidor();
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  const { data: perfil } = await sb
    .from("perfiles")
    .select("id, agencia_id, usuario, nombre, nombre_corto, rol, vende, activo, telefono")
    .eq("id", data.user.id)
    .maybeSingle<Perfil>();
  if (!perfil?.activo) return null;
  const { data: agencia } = await sb.from("agencias").select("id, nombre, marca, grupo, ciudad, parametros").eq("id", perfil.agencia_id).single<Agencia>();
  if (!agencia) return null;
  return { sb, perfil, agencia, direccion: esDireccion(perfil.rol) };
});

export async function requerirSesion(): Promise<Sesion> {
  const s = await obtenerSesion();
  if (!s) redirect("/salir?motivo=sesion");
  return s;
}

export async function requerirDireccion(): Promise<Sesion> {
  const s = await requerirSesion();
  if (!s.direccion) redirect("/inicio");
  return s;
}
