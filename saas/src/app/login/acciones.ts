"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServidor } from "@/lib/supabase/servidor";

export type EstadoLogin = { error: string | null };

const Entrada = z.object({ usuario: z.string().trim().toLowerCase().min(2), contrasena: z.string().min(1, "Escribe tu contraseña.") });

export async function iniciarSesion(_: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const datos = Entrada.safeParse({ usuario: form.get("usuario"), contrasena: form.get("contrasena") });
  if (!datos.success) return { error: datos.error.issues[0]?.message ?? "Revisa tus datos." };

  // El correo se busca en el servidor para no exponer los correos del equipo.
  const admin = supabaseAdmin();
  const { data: perfil } = await admin.from("perfiles").select("id, activo").eq("usuario", datos.data.usuario).maybeSingle();
  if (!perfil?.activo) return { error: "Ese usuario no existe o está dado de baja." };
  const { data: cuenta } = await admin.auth.admin.getUserById(perfil.id);
  const email = cuenta.user?.email;
  if (!email) return { error: "Tu usuario no tiene acceso configurado. Pide a dirección que lo revise." };

  const sb = await supabaseServidor();
  const { error } = await sb.auth.signInWithPassword({ email, password: datos.data.contrasena });
  if (error) {
    if (/rate|too many/i.test(error.message)) return { error: "Demasiados intentos. Espera un minuto y vuelve a intentar." };
    return { error: "Contraseña incorrecta." };
  }
  redirect("/bienvenida");
}
