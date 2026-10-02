import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buscarModelo, elegirAsesor, normalizarLead } from "@/lib/dominio/leads";
import { hoy } from "@/lib/dominio/fechas";

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
  const lead = normalizarLead(datos);
  if ("error" in lead) return respuesta({ ok: false, error: lead.error }, 422);

  const admin = supabaseAdmin();
  const agenciaId = url.searchParams.get("agencia") ?? (await admin.from("agencias").select("id").order("created_at").limit(1).single()).data?.id;
  if (!agenciaId) return respuesta({ ok: false, error: "No hay agencia configurada." }, 500);

  // Si el teléfono ya llegó en los últimos 30 días, se agrega la nota al mismo prospecto.
  const hace30 = new Date(Date.now() - 30 * 864e5).toISOString();
  const { data: previo } = await admin.from("prospectos").select("id, asesor_id, notas").eq("agencia_id", agenciaId).eq("telefono", lead.telefono).gte("created_at", hace30).limit(1).maybeSingle();
  if (previo) {
    await admin.from("prospectos").update({ notas: [previo.notas, `— Volvió a escribir (${hoy()}) —`, lead.notas].filter(Boolean).join("\n").slice(0, 2000), fecha_siguiente: hoy(), calor: "alta" }).eq("id", previo.id);
    return respuesta({ ok: true, id: previo.id, asesor_id: previo.asesor_id, duplicado: true });
  }

  const [{ data: asesores }, { data: modelos }, { data: recientes }] = await Promise.all([
    admin.from("perfiles").select("id").eq("agencia_id", agenciaId).eq("activo", true).eq("rol", "asesor").eq("vende", true),
    admin.from("modelos").select("id, nombre").eq("agencia_id", agenciaId).eq("activo", true),
    admin.from("prospectos").select("asesor_id, created_at").eq("agencia_id", agenciaId).gte("created_at", hace30),
  ]);
  const inicioHoy = `${hoy()}T00:00:00-06:00`;
  const conteo = (asesores ?? []).map((a) => {
    const suyos = (recientes ?? []).filter((r) => r.asesor_id === a.id);
    return { id: a.id as string, total: suyos.length, hoy: suyos.filter((r) => new Date(r.created_at) >= new Date(inicioHoy)).length };
  });
  const asesor = elegirAsesor(conteo);
  if (!asesor) return respuesta({ ok: false, error: "No hay asesores activos para asignar." }, 500);
  const modelo = buscarModelo(lead.modelo, (modelos ?? []) as { id: string; nombre: string }[]);

  const { data, error } = await admin.from("prospectos").insert({
    agencia_id: agenciaId, asesor_id: asesor, nombre: lead.nombre, telefono: lead.telefono, modelo_id: modelo?.id ?? null,
    origen: lead.origen, calor: lead.calor, etapa: "nuevo", fecha_siguiente: hoy(), siguiente_accion: "Contactar por WhatsApp en menos de 5 minutos",
    notas: [lead.modelo && !modelo ? `Modelo que pidió: ${lead.modelo}` : null, lead.notas].filter(Boolean).join("\n") || null,
  }).select("id").single();
  if (error || !data) return respuesta({ ok: false, error: "No se pudo guardar: " + (error?.message ?? "") }, 500);
  return respuesta({ ok: true, id: data.id, asesor_id: asesor });
}
