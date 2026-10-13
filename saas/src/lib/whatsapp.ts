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

export async function enviarPlantilla(p: Plantilla): Promise<{ ok: boolean; error?: string }> {
  if (!whatsappListo()) return { ok: false, error: "WhatsApp sin configurar." };
  const version = process.env.WHATSAPP_API_VERSION || "v23.0";
  const componentes: object[] = [];
  if (p.imagen) componentes.push({ type: "header", parameters: [{ type: "image", image: { link: p.imagen } }] });
  if (p.variables.length) componentes.push({ type: "body", parameters: p.variables.map((t) => ({ type: "text", text: t.slice(0, 900) })) });
  try {
    const r = await fetch(`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: telefonoWa(p.telefono),
        type: "template",
        template: { name: p.nombre, language: { code: process.env.WHATSAPP_IDIOMA || "es_MX" }, components: componentes },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return { ok: false, error: `WhatsApp respondió ${r.status}: ${(await r.text()).slice(0, 300)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error de red con WhatsApp." };
  }
}
