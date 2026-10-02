"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirSesion } from "@/lib/sesion";
import type { Resultado } from "@/lib/tipos";

const Clave = z.object({
  actual: z.string().min(1, "Escribe tu contraseña actual."),
  nueva: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres.").max(72),
});

export async function cambiarContrasena(e: z.input<typeof Clave>): Promise<Resultado> {
  const s = await requerirSesion();
  const r = Clave.safeParse(e);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Revisa los datos." };
  if (r.data.actual === r.data.nueva) return { ok: false, error: "La nueva contraseña debe ser distinta a la actual." };
  const { data } = await s.sb.auth.getUser();
  const email = data.user?.email;
  if (!email) return { ok: false, error: "No se encontró tu cuenta." };
  const { error: e1 } = await s.sb.auth.signInWithPassword({ email, password: r.data.actual });
  if (e1) return { ok: false, error: "Tu contraseña actual no es correcta." };
  const { error } = await s.sb.auth.updateUser({ password: r.data.nueva });
  if (error) return { ok: false, error: "No se pudo cambiar: " + error.message };
  return { ok: true, mensaje: "Contraseña actualizada" };
}

const Datos = z.object({ nombre_corto: z.string().trim().min(1).max(30), telefono: z.string().trim().max(20).optional().nullable() });

export async function actualizarDatos(e: z.input<typeof Datos>): Promise<Resultado> {
  const s = await requerirSesion();
  const r = Datos.safeParse(e);
  if (!r.success) return { ok: false, error: "Revisa tus datos." };
  const { error } = await s.sb.from("perfiles").update({ nombre_corto: r.data.nombre_corto, telefono: r.data.telefono || null }).eq("id", s.perfil.id);
  if (error) return { ok: false, error: "No se pudo guardar: " + error.message };
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Datos guardados" };
}
