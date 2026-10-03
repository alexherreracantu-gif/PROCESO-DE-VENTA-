import { obtenerSesion } from "@/lib/sesion";
import { urlDeArchivo } from "@/lib/expedientes";

/**
 * Abre un archivo del expediente. Los permisos de la base deciden si el usuario lo puede ver;
 * luego se le manda a una URL firmada que vence en 2 minutos. ?descargar=1 → como descarga.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/expedientes/[id]">) {
  const s = await obtenerSesion();
  if (!s) return new Response("Tu sesión terminó. Vuelve a entrar al portal.", { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("No encontrado.", { status: 404 });
  const { data } = await s.sb.from("venta_documentos").select("nombre, ruta, enlace").eq("id", id)
    .maybeSingle<{ nombre: string; ruta: string | null; enlace: string | null }>();
  if (!data) return new Response("No encontrado.", { status: 404 });
  if (data.enlace) return Response.redirect(data.enlace, 302);
  try {
    const descargar = new URL(request.url).searchParams.get("descargar") ? data.nombre : undefined;
    return new Response(null, { status: 302, headers: { Location: await urlDeArchivo(data.ruta!, descargar), "Cache-Control": "no-store" } });
  } catch {
    return new Response("No se pudo abrir el archivo. Inténtalo otra vez.", { status: 502 });
  }
}
