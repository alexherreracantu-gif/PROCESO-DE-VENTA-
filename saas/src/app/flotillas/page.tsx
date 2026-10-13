import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sesionPanel } from "@/lib/panel";
import { catalogo } from "@/lib/datos";
import { hoy } from "@/lib/dominio/fechas";
import { MODELOS_POR_TIPO } from "@/lib/dominio/flotillas";
import { telefonoBonito, vigencia } from "@/lib/anuncios";
import { FOTOS_INCLUIDAS } from "@/lib/fotos-incluidas";
import { LandingFlotillas, type ModeloFlotilla } from "./landing-flotillas";

export const metadata: Metadata = {
  title: "Flotillas BYD · BYD Grupo TEC",
  description: "Autos eléctricos e híbridos para empresas, fraccionamientos y municipios. Calcula el ahorro de tu flotilla y recibe tu propuesta por WhatsApp.",
  robots: { index: true, follow: true },
};

/**
 * Landing pública de flotillas: calculadora de ahorro, modelos por uso y formulario que entra al CRM
 * como "Landing flotillas". Con ?a=<usuario> el prospecto le llega a ese asesor; sin él, por turno.
 */
export default async function Flotillas(props: PageProps<"/flotillas">) {
  const sp = await props.searchParams;
  const s = await sesionPanel();
  if (!s) notFound();
  const { modelos } = await catalogo(s);
  const usuario = typeof sp.a === "string" && /^[a-z0-9._-]{2,32}$/i.test(sp.a) ? sp.a.toLowerCase() : null;
  const { data: asesor } = usuario
    ? await s.sb.from("perfiles").select("nombre, nombre_corto, telefono").eq("agencia_id", s.agencia.id).eq("usuario", usuario).eq("activo", true).maybeSingle<{ nombre: string; nombre_corto: string; telefono: string | null }>()
    : { data: null };

  const claves = [...new Set(Object.values(MODELOS_POR_TIPO).flat().map((x) => x.clave))];
  const lista: ModeloFlotilla[] = claves.flatMap((clave) => {
    const m = modelos.find((x) => x.clave === clave && x.precio > 0);
    if (!m) return [];
    const fotos = FOTOS_INCLUIDAS[clave] ?? {};
    const id = clave.startsWith("king") ? fotos[2] ?? fotos[1] : fotos[1];
    return [{ clave, nombre: m.nombre, motor: m.motor, precio: m.precio, foto: id ? `/modelos/${id}.jpg` : null, mini: id ? `/modelos/${id}-mini.jpg` : null }];
  });
  if (!lista.length) notFound();

  return (
    <LandingFlotillas
      modelos={lista}
      asesor={asesor ? { usuario: usuario!, nombre: asesor.nombre, corto: asesor.nombre_corto, telefono: asesor.telefono, telefonoBonito: telefonoBonito(asesor.telefono) } : null}
      agencia={{ nombre: s.agencia.nombre, ciudad: s.agencia.ciudad ?? "Monterrey, N.L." }}
      vigencia={vigencia(hoy())}
      avisoPrivacidad={process.env.AVISO_PRIVACIDAD_URL || null}
    />
  );
}
