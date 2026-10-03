import "server-only";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Archivos del expediente en Supabase Storage (bucket privado). Nadie entra directo al bucket:
 * el portal revisa permisos con la sesión del usuario y luego firma una URL de corta duración
 * para subir o para ver cada archivo.
 */
export const BUCKET = "expedientes";
/** Límite por archivo. El plan gratis de Supabase permite hasta 50 MB. */
export const MAX_ARCHIVO = 25 * 1024 * 1024;

const EXTENSIONES = ["pdf", "jpg", "jpeg", "png", "webp", "heic", "heif", "xml", "xlsx", "xls", "docx", "doc", "csv", "txt"];

export function extensionValida(nombre: string) {
  const ext = nombre.toLowerCase().split(".").pop() ?? "";
  return EXTENSIONES.includes(ext);
}

/** Nombre seguro para la ruta: sin acentos, espacios ni caracteres raros. */
export function nombreSeguro(nombre: string) {
  const limpio = nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "");
  return (limpio || "archivo").slice(-80);
}

export function rutaNueva(agenciaId: string, ventaId: string, nombre: string) {
  return `${agenciaId}/${ventaId}/${randomUUID()}-${nombreSeguro(nombre)}`;
}

let bucketListo = false;
/** Crea el bucket privado la primera vez (si ya existe, no hace nada). */
async function asegurarBucket() {
  if (bucketListo) return;
  const st = supabaseAdmin().storage;
  const { error } = await st.getBucket(BUCKET);
  if (error) {
    const r = await st.createBucket(BUCKET, { public: false, fileSizeLimit: MAX_ARCHIVO });
    if (r.error && !/exist/i.test(r.error.message)) throw new Error(`No se pudo preparar el almacenamiento: ${r.error.message}`);
  }
  bucketListo = true;
}

/** URL firmada para que el navegador suba el archivo directo a Storage (sin pasar por Vercel). */
export async function urlDeSubida(ruta: string) {
  await asegurarBucket();
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).createSignedUploadUrl(ruta);
  if (error || !data) throw new Error(`No se pudo preparar la subida: ${error?.message ?? "sin respuesta"}`);
  return data.signedUrl;
}

/** ¿Ya está el archivo en Storage? (para no registrar subidas que fallaron). */
export async function existeArchivo(ruta: string) {
  const carpeta = ruta.slice(0, ruta.lastIndexOf("/"));
  const nombre = ruta.slice(ruta.lastIndexOf("/") + 1);
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).list(carpeta, { search: nombre, limit: 5 });
  if (error) return false;
  return (data ?? []).some((f) => f.name === nombre);
}

/** URL temporal (2 minutos) para ver o descargar un archivo. */
export async function urlDeArchivo(ruta: string, descargar?: string) {
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).createSignedUrl(ruta, 120, descargar ? { download: descargar } : undefined);
  if (error || !data) throw new Error(error?.message ?? "No se pudo abrir el archivo.");
  return data.signedUrl;
}

export async function borrarArchivos(rutas: string[]) {
  if (!rutas.length) return;
  await supabaseAdmin().storage.from(BUCKET).remove(rutas);
}
