"use server";

import { randomInt } from "node:crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DOMINIO_USUARIOS } from "@/lib/config";
import equipoInicial from "@/lib/equipo-inicial.json";

export type Credencial = { nombre: string; usuario: string; rol: string; contrasena: string };
export type EstadoInstalacion = { error: string | null; credenciales: Credencial[] | null };

const Entrada = z.object({
  codigo: z.string().optional(),
  contrasena: z.string().min(8, "Tu contraseña debe tener al menos 8 caracteres.").max(72),
  repetir: z.string(),
  usuarios: z.array(z.string()),
});

function temporal() {
  const l = "abcdefghjkmnpqrstuvwxyz";
  return `PP-${Array.from({ length: 4 }, () => l[randomInt(l.length)]).join("")}-${randomInt(1000, 9999)}`;
}

/** ¿Ya hay alguien dado de alta? Entonces la instalación está cerrada. */
export async function instalacionAbierta(): Promise<boolean> {
  const { count, error } = await supabaseAdmin().from("perfiles").select("id", { count: "exact", head: true });
  if (error) throw new Error("La base de datos todavía no está lista: " + error.message);
  return (count ?? 0) === 0;
}

export async function instalar(_: EstadoInstalacion, form: FormData): Promise<EstadoInstalacion> {
  const r = Entrada.safeParse({ codigo: form.get("codigo") ?? undefined, contrasena: form.get("contrasena"), repetir: form.get("repetir"), usuarios: form.getAll("usuarios") });
  if (!r.success) return { error: r.error.issues[0]?.message ?? "Revisa los datos.", credenciales: null };
  if (r.data.contrasena !== r.data.repetir) return { error: "Las contraseñas no coinciden.", credenciales: null };
  const codigo = process.env.CODIGO_INSTALACION;
  if (codigo && r.data.codigo?.trim() !== codigo) return { error: "El código de instalación no es correcto.", credenciales: null };
  if (!(await instalacionAbierta())) return { error: "El portal ya está configurado. Entra con tu usuario.", credenciales: null };

  const admin = supabaseAdmin();
  const { data: agencia } = await admin.from("agencias").select("id").order("created_at").limit(1).maybeSingle();
  if (!agencia) return { error: "No se encontró la agencia. Vuelve a desplegar para que se cargue el catálogo.", credenciales: null };

  const ceo = equipoInicial.usuarios.find((u) => u.rol === "ceo")!;
  const elegidos = equipoInicial.usuarios.filter((u) => u.rol === "ceo" || r.data.usuarios.includes(u.usuario));
  const credenciales: Credencial[] = [];
  for (const u of elegidos) {
    const contrasena = u.usuario === ceo.usuario ? r.data.contrasena : temporal();
    const { data, error } = await admin.auth.admin.createUser({ email: `${u.usuario}@${DOMINIO_USUARIOS}`, password: contrasena, email_confirm: true, user_metadata: { usuario: u.usuario } });
    if (error || !data.user) return { error: `No se pudo crear a ${u.nombre}: ${error?.message ?? ""}`, credenciales: credenciales.length ? credenciales : null };
    const { error: e2 } = await admin.from("perfiles").insert({ id: data.user.id, agencia_id: agencia.id, usuario: u.usuario, nombre: u.nombre, nombre_corto: u.nombre_corto, rol: u.rol, vende: u.vende });
    if (e2) { await admin.auth.admin.deleteUser(data.user.id); return { error: `No se pudo crear el perfil de ${u.nombre}: ${e2.message}`, credenciales: null }; }
    if (u.usuario !== ceo.usuario) credenciales.push({ nombre: u.nombre, usuario: u.usuario, rol: u.rol, contrasena });
  }
  return { error: null, credenciales };
}
