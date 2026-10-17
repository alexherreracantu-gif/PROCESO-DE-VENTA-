import "server-only";
import { telefonoWa } from "@/lib/dominio/formato";

/**
 * Mensajes automáticos por la API de WhatsApp Business (Cloud API de Meta). Solo funciona si están
 * WHATSAPP_TOKEN y WHATSAPP_PHONE_ID; sin ellos no hace nada. WhatsApp exige plantillas aprobadas en
 * WhatsApp Manager para escribirle primero a alguien, y que esa persona haya aceptado recibir mensajes.
 */
export function whatsappListo() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
}

type Plantilla = {
  telefono: string;
  nombre: string;              // nombre de la plantilla aprobada
  variables: string[];         // {{1}}, {{2}}… del cuerpo, en orden
  imagen?: string | null;      // URL pública de la imagen del encabezado, si la plantilla lleva imagen
};
type Envio = { ok: true; id: string | null } | { ok: false; error: string };

/** Las variables no pueden llevar saltos de línea, tabuladores ni más de 4 espacios seguidos. */
const variable = (t: string) => t.replace(/\s+/g, " ").trim().slice(0, 900) || "-";

export async function enviarPlantilla(p: Plantilla): Promise<Envio> {
  const componentes: object[] = [];
  if (p.imagen) componentes.push({ type: "header", parameters: [{ type: "image", image: { link: p.imagen } }] });
  if (p.variables.length) componentes.push({ type: "body", parameters: p.variables.map((t) => ({ type: "text", text: variable(t) })) });
  return mandar(p.telefono, {
    type: "template",
    template: { name: p.nombre, language: { code: process.env.WHATSAPP_IDIOMA || "es_MX" }, components: componentes },
  });
}

/** Texto libre: WhatsApp solo lo deja mandar dentro de las 24 horas después de que la persona escribió. */
export async function enviarTexto(telefono: string, texto: string): Promise<Envio> {
  return mandar(telefono, { type: "text", text: { body: texto.slice(0, 4000) } });
}

async function mandar(telefono: string, mensaje: object): Promise<Envio> {
  if (!whatsappListo()) return { ok: false, error: "WhatsApp sin configurar." };
  const version = process.env.WHATSAPP_API_VERSION || "v23.0";
  try {
    const r = await fetch(`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: telefonoWa(telefono), ...mensaje }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return { ok: false, error: `WhatsApp respondió ${r.status}: ${(await r.text()).slice(0, 300)}` };
    const d = (await r.json().catch(() => null)) as { messages?: { id?: string }[] } | null;
    return { ok: true, id: d?.messages?.[0]?.id ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error de red con WhatsApp." };
  }
}
