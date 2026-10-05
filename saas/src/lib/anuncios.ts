/**
 * Generador de anuncios: números de la oferta, letra chica y textos para redes.
 * Sin dependencias del navegador, para poder probarlo.
 */
import { cotizar, type ModeloCotizable } from "@/lib/dominio/banorte";
import { MESES } from "@/lib/dominio/fechas";
import { dinero } from "@/lib/dominio/formato";
import type { Campana } from "@/lib/tipos";

export type ModeloAnuncio = ModeloCotizable & { nombre: string; descripcion: string | null; autonomia?: string | null; campana?: Campana };

/** Autonomía para la pestaña del modelo (fuentes: BYD México y prensa del lanzamiento). Editable en el generador. */
export const AUTONOMIA: Record<string, string> = {
  "dolphin-mini-300": "100% ELÉCTRICO",
  "dolphin-mini-380": "100% ELÉCTRICO",
  "yuan-pro-ev": "100% ELÉCTRICO",
  "seal-rwd": "100% ELÉCTRICO",
  "seal-awd": "100% ELÉCTRICO",
  "king-gl": "COMB. 1,680 KM*",
  "king-gs": "COMB. 1,680 KM*",
  "yuan-pro-dmi": "COMB. 1,045 KM*",
  "song-plus": "COMB. 1,105 KM*",
  "song-pro": "COMB. 1,001 KM*",
  "shark-gl": "COMB. 840 KM*",
  "shark-gs": "COMB. 840 KM*",
  "sealion-7": "456 KM*",
  "m9": "COMB. 945 KM*",
  "atto-8": "COMB. 1,030 KM*",
};

export const tasaTexto = (t: number) => `${(t * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
export const cifra = (n: number) => Math.round(n).toLocaleString("es-MX");

/** "8112345678" → "81 1234 5678" (o lo deja como venga si no son 10 dígitos). */
export function telefonoBonito(tel: string | null | undefined): string {
  const d = String(tel ?? "").replace(/\D/g, "").replace(/^52(?=\d{10}$)/, "");
  return d.length === 10 ? `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}` : String(tel ?? "").trim();
}

/** Último día del mes de `hoy` (YYYY-MM-DD): "31 de octubre de 2026". */
export function vigencia(hoy: string): string {
  const [a, m] = hoy.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return `${ultimo} de ${MESES[m - 1]} de ${a}`;
}

/**
 * Mensualidad "desde" con el cotizador Banorte del portal: enganche total (con bono) = % del precio.
 * Sin accesorios, garantía ni seguros.
 */
export function escenario(m: ModeloCotizable, pctEnganche: number, plazo: number) {
  const aportacion = Math.max(0, Math.round(m.precio * pctEnganche) - m.bono);
  const q = cotizar({ modelo: m, aportacion, accesorios: 0, garantia: 0, plazo, placas: 0, tramites: 0 });
  return { mensualidad: q.mensualidad, tasa: q.convenio.tasa, pctEnganche: q.pctEnganche, bonoAplica: q.bonoAplica, enganche: q.enganche };
}

/**
 * Frases del argumento de venta que son condiciones de la oferta (ej. "Bono … solo con interior gris/azul",
 * "Precio especial de octubre"). Las notas internas ("El bono más visible del piso") no salen.
 */
export function condicionesModelo(descripcion: string | null): string[] {
  return (descripcion ?? "").split(/(?<=\.)\s+/).map((f) => f.trim())
    .filter((f) => /precio especial/i.test(f) || (/bono/i.test(f) && /(?<!\p{L})(solo|únicamente|aplica)(?!\p{L})/iu.test(f)));
}

export type OpcionesLegal = {
  modelo: ModeloAnuncio; hoy: string; conBono: boolean;
  mensualidad?: { pctEnganche: number; plazo: number; tasa: number } | null;
  /** Mensualidad y tasa oficiales de la campaña del mes (no calculadas en el portal). */
  campana?: boolean;
  extra?: string;
};

/** Autonomía del modelo: la del catálogo o la de referencia. */
export const autonomiaDe = (m: Pick<ModeloAnuncio, "clave" | "autonomia">) => m.autonomia || AUTONOMIA[m.clave] || "";

/** Letra chica del anuncio: precio con IVA, condiciones del bono y de la mensualidad, vigencia. */
export function textoLegal(o: OpcionesLegal): string {
  const partes = [
    "Aplican restricciones.",
    `Precio público ${o.modelo.nombre} ${o.modelo.anio}: ${dinero(o.modelo.precio)} con IVA incluido.`,
  ];
  if (o.conBono && o.modelo.bono > 0) {
    partes.push(`Bono flexible de ${dinero(o.modelo.bono)} financiando con BBVA, Santander, Banorte o KUNA desde 5% de enganche; de contado aplica precio lleno.`);
    partes.push(...condicionesModelo(o.modelo.descripcion));
  }
  if (o.mensualidad) {
    partes.push(`Mensualidad calculada con Banorte Plan Tradicional, enganche de ${Math.round(o.mensualidad.pctEnganche * 100)}%, plazo de ${o.mensualidad.plazo} meses y tasa fija anual de ${tasaTexto(o.mensualidad.tasa)} sin IVA; no incluye comisión por apertura, seguros, placas ni trámites. Sujeto a aprobación de crédito.`);
  }
  if (o.campana && !o.mensualidad) {
    partes.push("Mensualidades, tasas y enganches de la campaña del mes con financiamiento de las instituciones participantes; sujetos a aprobación de crédito, no incluyen comisión por apertura, seguros, placas ni trámites.");
  }
  if (o.extra?.trim()) partes.push(o.extra.trim());
  partes.push(`Vigencia al ${vigencia(o.hoy)} o hasta agotar existencias. Las tasas, mensualidades y ofertas pueden cambiar sin previo aviso. Imágenes ilustrativas. Consulta términos y condiciones en la agencia.`);
  return partes.join(" ");
}

export type OpcionesCopy = {
  modelo: ModeloAnuncio; conBono: boolean; mensualidad?: { valor: number; tasa: number } | null;
  asesor: string; telefono: string; agencia: string; ciudad: string;
};

/** Textos listos para pegar en Facebook / Instagram / Meta Ads y en el estado de WhatsApp. */
export function textosAnuncio(o: OpcionesCopy) {
  const nombre = `BYD ${o.modelo.nombre} ${o.modelo.anio}`;
  const tel = telefonoBonito(o.telefono);
  const lineas = [
    `🚗 ${nombre}`,
    `💰 Precio: ${dinero(o.modelo.precio)}*`,
    o.conBono && o.modelo.bono > 0 ? `🎁 Bono flexible de ${dinero(o.modelo.bono)}* financiando` : null,
    o.mensualidad ? `📆 Mensualidades desde ${dinero(o.mensualidad.valor)}* · tasa desde ${tasaTexto(o.mensualidad.tasa)}*` : null,
    `📍 ${o.agencia}, ${o.ciudad}`,
    tel ? `📲 Escríbeme por WhatsApp y agenda tu prueba de manejo: ${tel}${o.asesor ? ` (${o.asesor})` : ""}` : "📲 Escríbenos y agenda tu prueba de manejo.",
    "",
    "*Aplican restricciones. Consulta términos y condiciones en la agencia.",
  ].filter((l): l is string => l !== null);
  const etiqueta = o.modelo.nombre.replace(/[^A-Za-z0-9]/g, "");
  const hashtags = ["#BYD", "#BYDMexico", `#BYD${etiqueta}`, "#Monterrey", o.modelo.motor === "electrico" ? "#AutoElectrico" : "#HibridoEnchufable", "#BuildYourDreams"].join(" ");
  const titulo = o.conBono && o.modelo.bono > 0 ? `${nombre}: bono de ${dinero(o.modelo.bono)}` : `Estrena tu ${nombre}`;
  const whatsapp = `${nombre}${o.conBono && o.modelo.bono > 0 ? ` con bono de ${dinero(o.modelo.bono)}` : ""}${o.mensualidad ? `, mensualidades desde ${dinero(o.mensualidad.valor)}` : ""}. ¡Pregúntame y agenda tu prueba de manejo! 🚗⚡`;
  return { principal: lineas.join("\n"), titulo, descripcion: "Agenda tu prueba de manejo en BYD Cumbres.", hashtags, whatsapp };
}
