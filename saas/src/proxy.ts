import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLICAS = ["/login", "/configurar", "/salir", "/instalar", "/api/leads"];

/** Refresca la sesión de Supabase en cada visita y manda al login a quien no la tenga. */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, llave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const ruta = request.nextUrl.pathname;
  if (!url || !llave) {
    return ruta === "/configurar" ? NextResponse.next() : NextResponse.redirect(new URL("/configurar", request.url));
  }
  let respuesta = NextResponse.next({ request });
  const supabase = createServerClient(url, llave, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista, encabezados) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
        Object.entries(encabezados ?? {}).forEach(([k, v]) => respuesta.headers.set(k, v));
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  const publica = PUBLICAS.some((p) => ruta.startsWith(p));
  if (!data.user && ruta.startsWith("/api/")) return new NextResponse("Tu sesión terminó. Vuelve a entrar.", { status: 401 });
  if (!data.user && !publica) {
    const destino = new URL("/login", request.url);
    return NextResponse.redirect(destino);
  }
  if (data.user && ruta === "/login") return NextResponse.redirect(new URL("/inicio", request.url));
  return respuesta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|.*\\.(?:png|jpg|svg|webp|ico)$).*)"],
};
