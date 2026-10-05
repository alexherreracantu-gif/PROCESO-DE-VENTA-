import { timingSafeEqual } from "node:crypto";
import { esRobot, normalizarLead } from "@/lib/dominio/leads";
import { registrarLead } from "@/lib/leads-servidor";

/**
 * Recibe prospectos de la landing, de Meta Lead Ads (vía Make/Zapier) o de cualquier formulario
 * y los reparte por turno entre los asesores. Requiere LEADS_TOKEN: ?token=… o "Authorization: Bearer …".
 */
function autorizado(request: Request, url: URL) {
  const esperado = process.env.LEADS_TOKEN;
  if (!esperado) return false;
  const recibido = url.searchParams.get("token") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(recibido), b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function leerCuerpo(request: Request): Promise<Record<string, string>> {
  const tipo = request.headers.get("content-type") ?? "";
  const texto = await request.text();
  if (tipo.includes("application/json") || texto.trim().startsWith("{")) {
    const j = JSON.parse(texto) as Record<string, unknown>;
    // Meta envía field_data: [{ name, values: [...] }]
    const campos = Array.isArray(j.field_data) ? Object.fromEntries((j.field_data as { name: string; values: string[] }[]).map((f) => [f.name, f.values?.[0] ?? ""])) : {};
    return Object.fromEntries(Object.entries({ ...j, ...campos }).filter(([, v]) => typeof v === "string" || typeof v === "number").map(([k, v]) => [k.toLowerCase(), String(v)]));
  }
  return Object.fromEntries([...new URLSearchParams(texto)].map(([k, v]) => [k.toLowerCase(), v]));
}

const respuesta = (cuerpo: object, status = 200) => Response.json(cuerpo, { status, headers: { "Access-Control-Allow-Origin": "*" } });

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!autorizado(request, url)) return respuesta({ ok: false, error: "Token inválido o LEADS_TOKEN sin configurar." }, 401);
  let datos: Record<string, string>;
  try { datos = await leerCuerpo(request); } catch { return respuesta({ ok: false, error: "Cuerpo inválido." }, 400); }
  // Robots: llenaron el campo trampa o mandaron el formulario en menos de 3 segundos. Se les responde
  // "ok" para que no reintenten, pero no se guarda nada.
  if (esRobot(datos)) return respuesta({ ok: true });
  const lead = normalizarLead(datos);
  if ("error" in lead) return respuesta({ ok: false, error: lead.error }, 422);

  const r = await registrarLead(lead, { agenciaId: url.searchParams.get("agencia") });
  if (!r.ok) return respuesta({ ok: false, error: r.error }, r.status);
  return respuesta(r);
}
