/**
 * Empaca la extensión de Chrome (conector-banorte/) en public/conector-banorte.zip,
 * que el Cotizador ofrece para descargar. Correr después de cambiar la extensión:
 *   npm run conector
 * La prueba "conector Banorte" falla si el ZIP quedó desactualizado.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { zipSync, type Zippable } from "fflate";

export const ARCHIVOS_CONECTOR = ["manifest.json", "banorte.js", "LEEME.txt"] as const;

export function empacarConector(raiz: string): Uint8Array {
  const fecha = new Date("2026-10-05T12:00:00Z"); // fija: el ZIP sale idéntico cada vez
  const entradas: Zippable = {};
  for (const f of ARCHIVOS_CONECTOR) entradas[`conector-banorte/${f}`] = [readFileSync(join(raiz, "conector-banorte", f)), { mtime: fecha }];
  return zipSync(entradas, { level: 9 });
}

if (process.argv[1]?.endsWith("empacar-conector.ts")) {
  const raiz = join(import.meta.dirname, "..");
  writeFileSync(join(raiz, "public", "conector-banorte.zip"), empacarConector(raiz));
  console.log("public/conector-banorte.zip listo");
}
