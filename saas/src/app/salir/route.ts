import { NextResponse, type NextRequest } from "next/server";
import { supabaseServidor } from "@/lib/supabase/servidor";

/** Cierra la sesión y regresa al inicio de sesión. */
export async function GET(request: NextRequest) {
  const sb = await supabaseServidor();
  await sb.auth.signOut();
  const destino = new URL("/login", request.url);
  const motivo = request.nextUrl.searchParams.get("motivo");
  if (motivo) destino.searchParams.set("motivo", motivo);
  return NextResponse.redirect(destino);
}
export const POST = GET;
