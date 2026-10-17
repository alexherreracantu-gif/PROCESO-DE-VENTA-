import { after } from "next/server";
import { sesionPanel } from "@/lib/panel";
import { enviarPlantilla, enviarTexto } from "@/lib/whatsapp";
import { fechaCorta, horaMty, hoy } from "@/lib/dominio/fechas";
import { firmaValida, leerWebhook, RANGO_ESTADO, textoCorto } from "@/lib/dominio/whatsapp-seguimiento";

/**
 * Webhook de WhatsApp Business (Meta → este portal). En Meta: WhatsApp → Configuración → Webhook,
 * URL https://TU-PORTAL/api/whatsapp/webhook, el mismo WHATSAPP_VERIFY_TOKEN y suscribirse a "messages".
 *  · Cada aviso viene firmado con el App Secret (WHATSAPP_APP_SECRET); sin firma válida se rechaza.
 *  · Si un prospecto contesta: se detiene su seguimiento automático, se anota en el CRM para hoy y,
 *    con WHATSAPP_PLANTILLA_RESPUESTA, se avisa al asesor por WhatsApp.
 *  · Si escribe BAJA (o STOP, ALTO…): no se le vuelve a mandar nada automático y se le confirma.
 *  · Los estados de entrega (entregado, leído, falló) se guardan en cada mensaje automático.
 */
const MAX_NOTAS = 4000;

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === token) {
    return new Response(q.get("hub.challenge") ?? "", { headers: { "Content-Type": "text/plain" } });
  }
  return new Response("No autorizado.", { status: 403 });
}

export async function POST(request: Request) {
  const cuerpo = await request.text();
  if (!firmaValida(cuerpo, request.headers.get("x-hub-signature-256"), process.env.WHATSAPP_APP_SECRET)) {
    return Response.json({ ok: false, error: "Firma inválida." }, { status: 401 });
  }
  let json: unknown;
  try { json = JSON.parse(cuerpo); } catch { return Response.json({ ok: false, error: "JSON inválido." }, { status: 400 }); }
  const { mensajes, estados } = leerWebhook(json, process.env.WHATSAPP_PHONE_ID);
  if (!mensajes.length && !estados.length) return Response.json({ ok: true });
  const s = await sesionPanel();
  if (!s) return Response.json({ ok: false, error: "No hay agencia." }, { status: 500 });
  const sb = s.sb, ag = s.agencia.id;
  // Si algo falla con la base, se contesta 500 y Meta vuelve a mandar el aviso (lo ya guardado no se repite).
  const falla = (e: { message: string }) => Response.json({ ok: false, error: e.message }, { status: 500 });

  for (const e of estados) {
    const anteriores = Object.keys(RANGO_ESTADO).filter((k) => RANGO_ESTADO[k] < RANGO_ESTADO[e.estado]);
    const { error } = await sb.from("whatsapp_mensajes").update({ estado: e.estado, ...(e.error ? { error: e.error.slice(0, 300) } : {}) })
      .eq("agencia_id", ag).eq("wa_id", e.waId).in("estado", anteriores);
    if (error) return falla(error);
  }

  const avisos: { que: string; enviar: () => Promise<{ ok: boolean; error?: string }> }[] = [];
  for (const m of mensajes) {
    const { data: p, error: e1 } = await sb.from("prospectos").select("id, nombre, asesor_id, notas")
      .eq("agencia_id", ag).eq("telefono", m.telefono).order("created_at", { ascending: false }).limit(1)
      .maybeSingle<{ id: string; nombre: string; asesor_id: string; notas: string | null }>();
    if (e1) return falla(e1);
    // Un número que no está en el CRM y no pide baja: no se guarda nada.
    if (!p && !m.baja) continue;
    // La baja va primero: aunque algo de abajo falle y Meta reintente, la baja ya quedó.
    if (m.baja) {
      const { error } = await sb.from("whatsapp_bajas").upsert({ agencia_id: ag, telefono: m.telefono }, { onConflict: "agencia_id,telefono", ignoreDuplicates: true });
      if (error) return falla(error);
    }
    const { data: nuevo, error: e2 } = await sb.from("whatsapp_entrantes")
      .upsert({ agencia_id: ag, wa_id: m.waId, telefono: m.telefono, prospecto_id: p?.id ?? null, baja: m.baja }, { onConflict: "wa_id", ignoreDuplicates: true })
      .select("id");
    if (e2) return falla(e2);
    if (!nuevo?.length) continue; // Meta lo reenvió y ya se había procesado

    if (m.baja) {
      avisos.push({ que: "confirmación de baja", enviar: () => enviarTexto(m.telefono, "Listo, ya no te enviaremos mensajes automáticos. Si más adelante quieres información de BYD, escríbenos.") });
    }
    if (!p) continue;

    const linea = `${fechaCorta(hoy())} ${horaMty()} · ${m.baja ? "Pidió BAJA de los mensajes automáticos de WhatsApp." : `Respondió por WhatsApp: «${textoCorto(m.texto)}»`}`;
    const notas = (p.notas ?? "").length + linea.length < MAX_NOTAS ? [p.notas, linea].filter(Boolean).join("\n") : p.notas;
    const { error: e3 } = await sb.from("prospectos").update({
      notas,
      siguiente_accion: m.baja ? "Pidió BAJA: no mandarle mensajes automáticos" : "Respondió el WhatsApp automático: contéstale ya desde tu WhatsApp",
      fecha_siguiente: hoy(),
    }).eq("id", p.id);
    if (e3) return falla(e3);

    const plantilla = process.env.WHATSAPP_PLANTILLA_RESPUESTA;
    if (!m.baja && plantilla) {
      // Un aviso al asesor por conversación: si el cliente ya había escrito en las últimas 6 horas, no se repite.
      const { count } = await sb.from("whatsapp_entrantes").select("id", { count: "exact", head: true })
        .eq("agencia_id", ag).eq("telefono", m.telefono).neq("id", nuevo[0].id).gte("created_at", new Date(Date.now() - 6 * 3_600_000).toISOString());
      const { data: a } = await sb.from("perfiles").select("telefono").eq("id", p.asesor_id).maybeSingle<{ telefono: string | null }>();
      if (!count && a?.telefono) {
        // Plantilla del aviso: {{1}} cliente, {{2}} su WhatsApp, {{3}} lo que escribió.
        avisos.push({ que: "aviso al asesor", enviar: () => enviarPlantilla({ telefono: a.telefono!, nombre: plantilla, variables: [p.nombre, m.telefono, textoCorto(m.texto, 120)] }) });
      }
    }
  }

  if (avisos.length) {
    after(async () => {
      for (const a of avisos) {
        const r = await a.enviar();
        if (!r.ok) console.error(`WhatsApp (${a.que}):`, r.error);
      }
    });
  }
  return Response.json({ ok: true });
}
