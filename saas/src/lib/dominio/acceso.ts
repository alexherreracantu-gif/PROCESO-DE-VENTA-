/** Rutas que se abren sin sesión. `/api/leads` se protege con su propio LEADS_TOKEN. */
export const RUTAS_PUBLICAS = ["/login", "/configurar", "/salir", "/instalar", "/api/leads"];

export type Acceso = "pasar" | "no-autorizado" | "al-login" | "al-inicio";

/** Decide qué hacer con una visita según la ruta y si hay usuario con sesión. */
export function decidirAcceso(ruta: string, conUsuario: boolean): Acceso {
  const publica = RUTAS_PUBLICAS.some((p) => ruta === p || ruta.startsWith(`${p}/`));
  if (!conUsuario && !publica) return ruta.startsWith("/api/") ? "no-autorizado" : "al-login";
  if (conUsuario && ruta === "/login") return "al-inicio";
  return "pasar";
}
