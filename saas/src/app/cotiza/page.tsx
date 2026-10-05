import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sesionPanel } from "@/lib/panel";
import { catalogo } from "@/lib/datos";
import { hoy } from "@/lib/dominio/fechas";
import { autonomiaDe, telefonoBonito, vigencia } from "@/lib/anuncios";
import { FOTOS_INCLUIDAS } from "@/lib/fotos-incluidas";
import { CotizadorPublico, type ModeloPublico } from "./cotizador-publico";

export const metadata: Metadata = {
  title: "Cotiza tu BYD · BYD Grupo TEC",
  description: "Calcula tu mensualidad BYD con el bono del mes y recibe tu cotización por WhatsApp.",
  robots: { index: true, follow: true },
};

/**
 * Cotizador público para clientes (sin contraseña). Toma precios, bonos y la campaña del mes del
 * catálogo; con ?a=<usuario> la cotización le llega a ese asesor. Se comparte en redes y WhatsApp.
 */
export default async function Cotiza(props: PageProps<"/cotiza">) {
  const sp = await props.searchParams;
  const s = await sesionPanel();
  if (!s) notFound();
  const { modelos } = await catalogo(s);
  const pa = s.agencia.parametros;
  const usuario = typeof sp.a === "string" && /^[a-z0-9._-]{2,32}$/i.test(sp.a) ? sp.a.toLowerCase() : null;
  const { data: asesor } = usuario
    ? await s.sb.from("perfiles").select("nombre, nombre_corto, telefono").eq("agencia_id", s.agencia.id).eq("usuario", usuario).eq("activo", true).maybeSingle<{ nombre: string; nombre_corto: string; telefono: string | null }>()
    : { data: null };

  const lista: ModeloPublico[] = modelos.filter((m) => m.precio > 0).map((m) => {
    const fotos = FOTOS_INCLUIDAS[m.clave] ?? {};
    // La foto 1 del King es una pieza con texto; para la portada se usa la 2.
    const orden = m.clave.startsWith("king") ? ([2, 1, 3] as const) : ([1, 2, 3] as const);
    const ids = orden.map((n) => fotos[n]).filter((x): x is string => !!x);
    return {
      id: m.id, clave: m.clave, nombre: m.nombre, anio: m.anio, motor: m.motor, precio: m.precio, bono: m.bono,
      autonomia: autonomiaDe(m), mensualidadDesde: m.campana?.mensualidad ?? null, tasaDesde: m.campana?.tasa ?? null,
      foto: ids[0] ? `/modelos/${ids[0]}.jpg` : null, mini: ids[0] ? `/modelos/${ids[0]}-mini.jpg` : null,
    };
  });
  const inicial = typeof sp.m === "string" && lista.some((m) => m.clave === sp.m) ? sp.m : (lista.find((m) => m.clave === "king-gl") ?? lista[0])?.clave;
  if (!inicial) notFound();

  return (
    <CotizadorPublico
      modelos={lista}
      inicial={inicial}
      parametros={{ garantia: pa.garantia_extendida ?? 9082, placasElectrico: pa.placas_electrico ?? 1760, placasHibrido: pa.placas_hibrido ?? 5866 }}
      asesor={asesor ? { usuario: usuario!, nombre: asesor.nombre, corto: asesor.nombre_corto, telefono: asesor.telefono, telefonoBonito: telefonoBonito(asesor.telefono) } : null}
      agencia={{ nombre: s.agencia.nombre, ciudad: s.agencia.ciudad ?? "Monterrey, N.L." }}
      vigencia={vigencia(hoy())}
    />
  );
}
