/**
 * Configura la base de datos de Supabase de un jalón:
 *   1. Aplica las migraciones de supabase/migrations (solo las que falten).
 *   2. Carga la agencia y el catálogo (supabase/seed.sql).
 *   3. Crea los usuarios del equipo (src/lib/equipo-inicial.json) con contraseña temporal.
 *
 * Uso: npm run setup   (lee .env.local)
 */
import { readFileSync } from "node:fs";
import { aplicarMigraciones, urlBaseDatos } from "./migrar";
import { join } from "node:path";
import { randomInt } from "node:crypto";
import { config } from "dotenv";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const raiz = join(import.meta.dirname, "..");
const DATABASE_URL = urlBaseDatos();
const { NEXT_PUBLIC_SUPABASE_URL } = process.env;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

function falta(nombre: string): never {
  console.error(`\n✖ Falta ${nombre} en .env.local. Revisa el README (paso 2).\n`);
  process.exit(1);
}

type UsuarioEquipo = { usuario: string; nombre: string; nombre_corto: string; rol: "ceo" | "gerente" | "asesor"; vende: boolean; email?: string };

function contrasenaTemporal() {
  const letras = "abcdefghjkmnpqrstuvwxyz";
  const p = Array.from({ length: 4 }, () => letras[randomInt(letras.length)]).join("");
  return `PP-${p}-${randomInt(1000, 9999)}`;
}

async function main() {
  if (!DATABASE_URL) falta("DATABASE_URL");
  if (!NEXT_PUBLIC_SUPABASE_URL) falta("NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) falta("SUPABASE_SERVICE_ROLE_KEY");

  const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {}, prepare: false });
  try {
    // 1 y 2. Migraciones, agencia y catálogo
    await aplicarMigraciones(DATABASE_URL);

    // 3. Equipo
    const equipo = JSON.parse(readFileSync(join(raiz, "src", "lib", "equipo-inicial.json"), "utf8")) as { agencia_id: string; usuarios: UsuarioEquipo[] };
    const admin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const existentes = new Set((await sql<{ usuario: string }[]>`select usuario from public.perfiles`).map((r) => r.usuario));
    const creados: { usuario: string; nombre: string; rol: string; contrasena: string }[] = [];
    for (const u of equipo.usuarios) {
      if (existentes.has(u.usuario)) continue;
      const contrasena = process.env.SETUP_CONTRASENA_FIJA || contrasenaTemporal();
      const email = u.email || `${u.usuario}@equipo.parkpoint.app`;
      const { data, error } = await admin.auth.admin.createUser({ email, password: contrasena, email_confirm: true, user_metadata: { usuario: u.usuario } });
      if (error || !data.user) throw new Error(`No se pudo crear ${u.usuario}: ${error?.message}`);
      await sql`insert into public.perfiles (id, agencia_id, usuario, nombre, nombre_corto, rol, vende)
                values (${data.user.id}, ${equipo.agencia_id}, ${u.usuario}, ${u.nombre}, ${u.nombre_corto}, ${u.rol}, ${u.vende})`;
      creados.push({ usuario: u.usuario, nombre: u.nombre, rol: u.rol, contrasena });
    }
    if (creados.length) {
      console.log("\n✔ Usuarios creados. Entrega a cada quien su contraseña temporal (la cambian en Mi perfil):\n");
      console.table(creados);
    } else {
      console.log("→ El equipo ya existía; no se crearon usuarios.");
    }
    console.log("\n✔ Listo. Corre `npm run dev` y entra en http://localhost:3000\n");
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error("\n✖", e instanceof Error ? e.message : e, "\n");
  process.exit(1);
});
