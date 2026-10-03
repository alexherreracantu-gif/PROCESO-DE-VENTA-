"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirSesion } from "@/lib/sesion";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Resultado } from "@/lib/tipos";

const Clave = z.object({
  actual: z.string().min(1, "Escribe tu contraseña actual."),
  nueva: z.string().min(7, "La nueva contraseña debe tener al menos 7 caracteres.").max(72),
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
  if (s.perfil.clave_temporal) await supabaseAdmin().from("perfiles").update({ clave_temporal: false }).eq("id", s.perfil.id);
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Contraseña actualizada" };
}

const Datos = z.object({
  nombre_corto: z.string().trim().min(1).max(30),
  telefono: z.string().trim().max(20).optional().nullable(),
  correo: z.string().trim().max(200).optional().nullable().refine((v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "Escribe un correo válido."),
});

export async function actualizarDatos(e: z.input<typeof Datos>): Promise<Resultado> {
  const s = await requerirSesion();
  const r = Datos.safeParse(e);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Revisa tus datos." };
  const { error } = await s.sb.from("perfiles").update({ nombre_corto: r.data.nombre_corto, telefono: r.data.telefono || null, correo: r.data.correo?.toLowerCase() || null }).eq("id", s.perfil.id);
  if (error) return { ok: false, error: "No se pudo guardar: " + error.message };
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Datos guardados" };
}
