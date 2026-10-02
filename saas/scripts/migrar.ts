/**
 * Aplica las migraciones pendientes y el catálogo inicial. Se corre solo en cada
 * despliegue (antes de `next build`) y desde `npm run setup`. Si no hay conexión
 * a la base configurada, no hace nada.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { config } from "dotenv";
import postgres from "postgres";

const raiz = join(import.meta.dirname, "..");

/** Conexión directa a Postgres: la de `.env.local` o la que inyecta la integración Supabase de Vercel. */
export function urlBaseDatos() {
  // Para cambios de esquema conviene la conexión sin pooler de transacciones (NON_POOLING).
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || "";
  return url ? limpiarUrl(url) : "";
}

/**
 * La integración de Vercel agrega parámetros propios (p. ej. `supa=base-pooler.x`) que
 * postgres.js mandaría al servidor como configuración y que Postgres rechaza.
 */
export function limpiarUrl(url: string) {
  try {
    const u = new URL(url);
    for (const k of [...u.searchParams.keys()]) {
      if (k !== "sslmode") u.searchParams.delete(k);
    }
    return u.toString();
  } catch {
    return url;
  }
}

export async function aplicarMigraciones(url: string, log: (t: string) => void = console.log) {
  const sql = postgres(url, { max: 1, onnotice: () => {}, prepare: false, connect_timeout: 20 });
  try {
    await sql`create schema if not exists interno`;
    await sql`create table if not exists interno.migraciones (nombre text primary key, aplicada timestamptz not null default now())`;
    const hechas = new Set((await sql<{ nombre: string }[]>`select nombre from interno.migraciones`).map((r) => r.nombre));
    const dir = join(raiz, "supabase", "migrations");
    const archivos = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    let nuevas = 0;
    for (const f of archivos) {
      if (hechas.has(f)) continue;
      await sql.begin(async (tx) => {
        await tx.unsafe(readFileSync(join(dir, f), "utf8"));
        await tx`insert into interno.migraciones (nombre) values (${f})`;
      });
      log(`→ Migración ${f} aplicada`);
      nuevas++;
    }
    await sql.unsafe(readFileSync(join(raiz, "supabase", "seed.sql"), "utf8"));
    try { await sql`notify pgrst, 'reload schema'`; } catch { /* no aplica */ }
    log(nuevas ? `✔ Base de datos al día (${nuevas} migraciones nuevas)` : "✔ Base de datos al día");
  } finally {
    await sql.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  config({ path: ".env.local", quiet: true });
  const url = urlBaseDatos();
  if (!url) {
    console.log("· Sin conexión a la base configurada: se omiten las migraciones.");
  } else {
    aplicarMigraciones(url).catch((e) => {
      console.error("✖ No se pudieron aplicar las migraciones:", e instanceof Error ? e.message : e);
      process.exit(1);
    });
  }
}
