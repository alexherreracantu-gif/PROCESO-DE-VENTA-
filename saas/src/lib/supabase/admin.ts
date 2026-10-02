import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";

/**
 * Cliente con la llave de servicio: se salta los permisos. Solo para el login
 * (buscar el correo de un usuario) y la administración del equipo, siempre
 * después de verificar quién está pidiendo el cambio.
 */
export function supabaseAdmin() {
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!llave) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.");
  return createClient(SUPABASE_URL, llave, { auth: { persistSession: false, autoRefreshToken: false } });
}
