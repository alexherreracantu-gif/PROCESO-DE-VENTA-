"use client";

import { confirmarSubida, prepararSubida } from "@/app/(portal)/ventas/expediente";

/** Fotos de celular (INE, comprobantes): se reducen a 2200 px en JPEG si pesan más de 1.5 MB. */
async function reducirImagen(archivo: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(archivo.type) || archivo.size < 1.5 * 1024 * 1024) return archivo;
  try {
    const bmp = await createImageBitmap(archivo);
    const escala = Math.min(1, 2200 / Math.max(bmp.width, bmp.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(bmp.width * escala);
    lienzo.height = Math.round(bmp.height * escala);
    const g = lienzo.getContext("2d");
    if (!g) return archivo;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, lienzo.width, lienzo.height);
    g.drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
    const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/jpeg", 0.85));
    if (!blob || blob.size >= archivo.size) return archivo;
    return new File([blob], archivo.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return archivo;
  }
}

/**
 * Sube un archivo al expediente: el portal revisa permisos y firma una URL, el navegador sube
 * directo a Storage (sin el límite de Vercel) y al final se registra en la venta.
 */
export async function subirArchivo(ventaId: string, tipo: string, original: File, movimientoId?: string | null): Promise<{ ok: true } | { ok: false; error: string }> {
  const archivo = await reducirImagen(original);
  const base = { ventaId, tipo, movimientoId: movimientoId ?? null, nombre: archivo.name, tamano: archivo.size, mime: archivo.type || null };
  const p = await prepararSubida(base);
  if (!p.ok) return p;
  const datos = new FormData();
  datos.append("cacheControl", "3600");
  datos.append("", archivo);
  try {
    const r = await fetch(p.url, { method: "PUT", body: datos, headers: { "x-upsert": "false" } });
    if (!r.ok) return { ok: false, error: `No se pudo subir ${archivo.name} (${r.status}).` };
  } catch {
    return { ok: false, error: `No se pudo subir ${archivo.name}. Revisa tu conexión.` };
  }
  const c = await confirmarSubida({ ...base, ruta: p.ruta });
  return c.ok ? { ok: true } : c;
}

export function pesoArchivo(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
