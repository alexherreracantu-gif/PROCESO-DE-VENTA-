/** Variables públicas de Supabase. Si faltan, la app muestra la pantalla de configuración. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
export const configurado = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
/** Dominio para los correos internos de usuarios sin correo real. */
export const DOMINIO_USUARIOS = "equipo.parkpoint.app";
