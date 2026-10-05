import { obtenerSesion } from "@/lib/sesion";

/** Sirve un anuncio oficial subido por dirección. ?t=mini → miniatura; ?descargar=1 → como archivo. */
export async function GET(request: Request, ctx: RouteContext<"/api/anuncios-oficiales/[id]">) {
  const s = await obtenerSesion();
  if (!s) return new Response("Tu sesión terminó.", { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("No encontrado.", { status: 404 });
  const url = new URL(request.url);
  const mini = url.searchParams.get("t") === "mini";
  const { data } = await s.sb.from("anuncios_oficiales").select(`titulo, mime, ${mini ? "miniatura" : "datos"}`).eq("id", id)
    .maybeSingle<{ titulo: string; mime: string; datos?: string; miniatura?: string }>();
  const b64 = mini ? data?.miniatura : data?.datos;
  if (!data || !b64) return new Response("No encontrado.", { status: 404 });
  const nombre = `${data.titulo.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "anuncio"}.jpg`;
  return new Response(Buffer.from(b64, "base64"), {
    headers: {
      "Content-Type": mini ? "image/jpeg" : data.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
      "Content-Disposition": `${url.searchParams.get("descargar") ? "attachment" : "inline"}; filename="${nombre}"`,
    },
  });
}
