import { obtenerSesion } from "@/lib/sesion";
import { esPosicion, nombreFoto } from "@/lib/fotos";

/**
 * Sirve una foto de modelo con la sesión del usuario (los permisos de la base deciden).
 * ?t=mini → miniatura para la galería; ?descargar=1 → como archivo adjunto.
 * La URL lleva ?v=<fecha de la foto>, así que se puede guardar en caché para siempre.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/fotos/[modelo]/[posicion]">) {
  const s = await obtenerSesion();
  if (!s) return new Response("Tu sesión terminó.", { status: 401 });
  const { modelo, posicion } = await ctx.params;
  const n = Number(posicion);
  if (!/^[0-9a-f-]{36}$/i.test(modelo) || !esPosicion(n)) return new Response("No encontrada.", { status: 404 });
  const url = new URL(request.url);
  const mini = url.searchParams.get("t") === "mini";
  const { data } = await s.sb.from("modelo_fotos").select(`mime, ${mini ? "miniatura" : "datos"}, modelos(nombre, anio)`)
    .eq("modelo_id", modelo).eq("posicion", n).maybeSingle<{ mime: string; datos?: string; miniatura?: string; modelos: { nombre: string; anio: number } | null }>();
  const b64 = mini ? data?.miniatura : data?.datos;
  if (!data || !b64) return new Response("No encontrada.", { status: 404 });
  const nombre = nombreFoto(`${data.modelos?.nombre ?? "modelo"} ${data.modelos?.anio ?? ""}`, n);
  return new Response(Buffer.from(b64, "base64"), {
    headers: {
      "Content-Type": mini ? "image/jpeg" : data.mime,
      "Cache-Control": url.searchParams.has("v") ? "private, max-age=31536000, immutable" : "private, no-cache",
      "Content-Disposition": `${url.searchParams.get("descargar") ? "attachment" : "inline"}; filename="${nombre}"`,
    },
  });
}
