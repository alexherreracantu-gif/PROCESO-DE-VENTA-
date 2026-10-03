"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirDireccion, type Sesion } from "@/lib/sesion";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DOMINIO_USUARIOS } from "@/lib/config";
import type { Perfil } from "@/lib/tipos";

type ResultadoEquipo = { ok: true; mensaje: string; contrasena?: string } | { ok: false; error: string };

function contrasenaTemporal() {
  const letras = "abcdefghjkmnpqrstuvwxyz";
  return `PP-${Array.from({ length: 4 }, () => letras[randomInt(letras.length)]).join("")}-${randomInt(1000, 9999)}`;
}

async function objetivo(s: Sesion, id: string): Promise<Perfil | null> {
  const { data } = await supabaseAdmin().from("perfiles").select("id, agencia_id, usuario, nombre, nombre_corto, rol, vende, activo, telefono").eq("id", id).maybeSingle<Perfil>();
  return data && data.agencia_id === s.agencia.id ? data : null;
}
/** Un gerente no puede tocar al CEO ni dar roles de dirección; nadie se cambia a sí mismo rol o estado. */
function puedeAdministrar(s: Sesion, t: Perfil) {
  if (s.perfil.rol === "ceo") return true;
  return t.rol !== "ceo";
}

const Nuevo = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre completo.").max(80),
  nombre_corto: z.string().trim().min(1, "Escribe cómo se le dice.").max(30),
  usuario: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{2,32}$/, "El usuario va en minúsculas, sin espacios ni acentos (ej. ana.lopez)."),
  rol: z.enum(["ceo", "gerente", "asesor"]),
  vende: z.boolean(),
  email: z.string().trim().email("Correo inválido.").optional().or(z.literal("")),
});

export async function crearUsuario(e: z.input<typeof Nuevo>): Promise<ResultadoEquipo> {
  const s = await requerirDireccion();
  const r = Nuevo.safeParse(e);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Revisa los datos." };
  if (r.data.rol !== "asesor" && s.perfil.rol !== "ceo") return { ok: false, error: "Solo el CEO puede dar de alta a otro gerente o CEO." };
  const admin = supabaseAdmin();
  const { data: existe } = await admin.from("perfiles").select("id").eq("usuario", r.data.usuario).maybeSingle();
  if (existe) return { ok: false, error: "Ese usuario ya existe. Elige otro." };
  const contrasena = contrasenaTemporal();
  const { data, error } = await admin.auth.admin.createUser({ email: r.data.email || `${r.data.usuario}@${DOMINIO_USUARIOS}`, password: contrasena, email_confirm: true, user_metadata: { usuario: r.data.usuario } });
  if (error || !data.user) return { ok: false, error: /already|registered|exists/i.test(error?.message ?? "") ? "Ese correo ya tiene cuenta." : "No se pudo crear la cuenta: " + (error?.message ?? "") };
  const { error: e2 } = await admin.from("perfiles").insert({ id: data.user.id, agencia_id: s.agencia.id, usuario: r.data.usuario, nombre: r.data.nombre, nombre_corto: r.data.nombre_corto, rol: r.data.rol, vende: r.data.vende, clave_temporal: true });
  if (e2) { await admin.auth.admin.deleteUser(data.user.id); return { ok: false, error: "No se pudo crear el perfil: " + e2.message }; }
  revalidatePath("/", "layout");
  return { ok: true, mensaje: `${r.data.nombre} ya puede entrar`, contrasena };
}

const Cambio = z.object({
  id: z.string(),
  nombre: z.string().trim().min(2).max(80),
  nombre_corto: z.string().trim().min(1).max(30),
  rol: z.enum(["ceo", "gerente", "asesor"]),
  vende: z.boolean(),
  activo: z.boolean(),
});

export async function actualizarUsuario(e: z.input<typeof Cambio>): Promise<ResultadoEquipo> {
  const s = await requerirDireccion();
  const r = Cambio.safeParse(e);
  if (!r.success) return { ok: false, error: "Revisa los datos." };
  const t = await objetivo(s, r.data.id);
  if (!t) return { ok: false, error: "No se encontró a esa persona en tu agencia." };
  if (!puedeAdministrar(s, t)) return { ok: false, error: "Solo el CEO puede modificar al CEO." };
  if (t.id === s.perfil.id && (r.data.rol !== t.rol || !r.data.activo)) return { ok: false, error: "No puedes cambiar tu propio rol ni darte de baja." };
  if (r.data.rol !== t.rol && r.data.rol !== "asesor" && s.perfil.rol !== "ceo") return { ok: false, error: "Solo el CEO puede dar roles de dirección." };
  const { id, ...cambios } = r.data;
  const { error } = await supabaseAdmin().from("perfiles").update(cambios).eq("id", id);
  if (error) return { ok: false, error: "No se pudo guardar: " + error.message };
  // Una baja también bloquea la cuenta para que no pueda volver a entrar.
  if (cambios.activo !== t.activo) await supabaseAdmin().auth.admin.updateUserById(id, { ban_duration: cambios.activo ? "none" : "876000h" });
  revalidatePath("/", "layout");
  return { ok: true, mensaje: cambios.activo ? "Cambios guardados" : `${t.nombre} quedó dado de baja` };
}

export async function restablecerContrasena(id: string): Promise<ResultadoEquipo> {
  const s = await requerirDireccion();
  const t = await objetivo(s, id);
  if (!t) return { ok: false, error: "No se encontró a esa persona en tu agencia." };
  if (!puedeAdministrar(s, t)) return { ok: false, error: "Solo el CEO puede modificar al CEO." };
  const contrasena = contrasenaTemporal();
  const { error } = await supabaseAdmin().auth.admin.updateUserById(id, { password: contrasena });
  if (error) return { ok: false, error: "No se pudo cambiar la contraseña: " + error.message };
  await supabaseAdmin().from("perfiles").update({ clave_temporal: true }).eq("id", id);
  return { ok: true, mensaje: `Nueva contraseña para ${t.nombre}`, contrasena };
}

const ClaveComun = z.string().min(7, "La contraseña debe tener al menos 7 caracteres.").max(72);

/** Pone la misma contraseña a todo el equipo activo (sin el CEO). Útil al arrancar el portal. */
export async function contrasenaParaTodos(nueva: string): Promise<ResultadoEquipo> {
  const s = await requerirDireccion();
  const r = ClaveComun.safeParse(nueva);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Revisa la contraseña." };
  const admin = supabaseAdmin();
  const { data, error } = await admin.from("perfiles").select("id, nombre, rol").eq("agencia_id", s.agencia.id).eq("activo", true).neq("rol", "ceo");
  if (error) return { ok: false, error: "No se pudo leer el equipo: " + error.message };
  const fallidos: string[] = [];
  for (const p of data ?? []) {
    const { error: e } = await admin.auth.admin.updateUserById(p.id, { password: r.data });
    if (e) fallidos.push(p.nombre);
    else await admin.from("perfiles").update({ clave_temporal: true }).eq("id", p.id);
  }
  if (fallidos.length) return { ok: false, error: `No se pudo cambiar la contraseña de: ${fallidos.join(", ")}.` };
  return { ok: true, mensaje: `Contraseña actualizada para ${data?.length ?? 0} personas` };
}
