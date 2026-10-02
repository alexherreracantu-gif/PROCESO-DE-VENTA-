/** Variables públicas de Supabase. Si faltan, la app muestra la pantalla de configuración. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
export const configurado = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
/** Dominio para los correos internos de usuarios sin correo real. */
export const DOMINIO_USUARIOS = "equipo.parkpoint.app";
/** Qué modelo usa el Agente IA: Claude si hay ANTHROPIC_API_KEY; si no, ChatGPT con OPENAI_API_KEY. */
export function proveedorAgente(): "anthropic" | "openai" | null {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

/**
 * Partes que están listas pero escondidas por ahora. Cambia a `true` para volver a mostrarlas;
 * el código y los datos siguen funcionando aunque no se vean.
 */
export const VISIBLE = {
  /** Agente IA en el menú (necesita saldo en OpenAI o Anthropic). */
  agente: false,
  /** Tarjeta "Seguimientos para hoy" de prospectos en el Inicio. */
  seguimientosEnInicio: false,
  /** CEO en el inicio de sesión. Escondido: dirección la lleva Jorge (gerente) y el CEO ve /panel. */
  ceoEnLogin: false,
};
