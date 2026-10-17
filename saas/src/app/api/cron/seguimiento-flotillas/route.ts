import { sesionPanel } from "@/lib/panel";
import { cronAutorizado } from "@/lib/cron";
import { enviarPlantilla, whatsappListo } from "@/lib/whatsapp";
import { hoy } from "@/lib/dominio/fechas";
import type { Etapa } from "@/lib/dominio/catalogos";
import {
  ETAPAS_CON_SEGUIMIENTO, decidirSeguimiento, diezDigitos, plantillasSeguimiento, type Decision, type PasoMensaje,
} from "@/lib/dominio/whatsapp-seguimiento";

/**
 * Seguimiento automático de flotillas (Vercel Cron, ver vercel.json): todos los días menos domingo, a
 * los prospectos de la landing que aceptaron WhatsApp les manda la plantilla del día 1, 3, 7 o 14.
 * Se detiene en cuanto el prospecto contesta, pide BAJA, pasa a cita o más adelante, o falla un envío.
 * Nunca manda el mismo paso dos veces ni más de un mensaje por día.
 * Necesita CRON_SECRET, WhatsApp configurado y WHATSAPP_SEGUIMIENTO con las 4 plantillas aprobadas.
 * Para probar: ?simular=1 (no manda nada) y ?fecha=AAAA-MM-DD.
 */
export const maxDuration = 60;

type Prospecto = { id: string; nombre: string; telefono: string | null; asesor_id: string; etapa: Etapa; created_at: string };

export async function GET(request: Request) {
  if (!cronAutorizado(request)) return Response.json({ ok: false, error: "No autorizado." }, { status: 401 });
  const q = new URL(request.url).searchParams;
  const simular = q.get("simular") === "1";
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(q.get("fecha") ?? "") ? q.get("fecha")! : hoy();
  const plantillas = plantillasSeguimiento(process.env.WHATSAPP_SEGUIMIENTO);
  if (!simular && (!whatsappListo() || !plantillas)) {
    return Response.json({ ok: false, error: "Seguimiento apagado: faltan WHATSAPP_TOKEN, WHATSAPP_PHONE_ID o las 4 plantillas en WHATSAPP_SEGUIMIENTO." });
  }
  if (!simular && new Date(`${fecha}T12:00:00Z`).getUTCDay() === 0) return Response.json({ ok: true, nota: "Domingo: no se mandan seguimientos." });
  const s = await sesionPanel();
  if (!s) return Response.json({ ok: false, error: "No hay agencia." }, { status: 500 });
  const sb = s.sb, ag = s.agencia.id;

  // Los del día 14 con 2 días de tolerancia, y uno más por la zona horaria.
  const desde = new Date(Date.parse(`${fecha}T12:00:00Z`) - 18 * 86_400_000).toISOString();
  const { data, error } = await sb.from("prospectos").select("id, nombre, telefono, asesor_id, etapa, created_at")
    .eq("agencia_id", ag).eq("origen", "Landing flotillas").in("etapa", ETAPAS_CON_SEGUIMIENTO).gte("created_at", desde)
    .eq("datos->flotilla->>aceptaWhatsapp", "true").not("telefono", "is", null).order("created_at").limit(300);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  const prospectos = ((data ?? []) as Prospecto[]).flatMap((p) => { const tel = diezDigitos(p.telefono); return tel ? [{ ...p, tel }] : []; });
  if (!prospectos.length) return Response.json({ ok: true, enviados: 0, nota: "Nadie en seguimiento." });

  const telefonos = [...new Set(prospectos.map((p) => p.tel))];
  const [mensajes, entrantes, bajas, gente] = await Promise.all([
    sb.from("whatsapp_mensajes").select("prospecto_id, paso, estado").in("prospecto_id", prospectos.map((p) => p.id)),
    sb.from("whatsapp_entrantes").select("telefono, created_at").eq("agencia_id", ag).in("telefono", telefonos).gte("created_at", desde),
    sb.from("whatsapp_bajas").select("telefono").eq("agencia_id", ag).in("telefono", telefonos),
    sb.from("perfiles").select("id, nombre_corto").eq("agencia_id", ag),
  ]);
  const fallo = [mensajes, entrantes, bajas, gente].find((r) => r.error)?.error;
  if (fallo) return Response.json({ ok: false, error: fallo.message }, { status: 500 });
  const enviadosDe = (id: string) => ((mensajes.data ?? []) as { prospecto_id: string; paso: PasoMensaje; estado: string }[]).filter((m) => m.prospecto_id === id);
  const respuestas = (entrantes.data ?? []) as { telefono: string; created_at: string }[];
  const deBaja = new Set(((bajas.data ?? []) as { telefono: string }[]).map((b) => b.telefono));
  const corto = new Map(((gente.data ?? []) as { id: string; nombre_corto: string }[]).map((p) => [p.id, p.nombre_corto]));

  const motivos: Record<string, number> = {}, porEnviar: { id: string; paso: string }[] = [], fallas: string[] = [];
  let enviados = 0;
  for (const p of prospectos) {
    const d: Decision = decidirSeguimiento({
      creado: hoy(new Date(p.created_at)), hoy: fecha, etapa: p.etapa, consentimiento: true,
      baja: deBaja.has(p.tel),
      respondio: respuestas.some((r) => r.telefono === p.tel && Date.parse(r.created_at) >= Date.parse(p.created_at)),
      enviados: enviadosDe(p.id),
    });
    if (d.accion === "nada") { motivos[d.motivo] = (motivos[d.motivo] ?? 0) + 1; continue; }
    if (simular || !plantillas) { porEnviar.push({ id: p.id, paso: d.paso }); continue; }

    // Se aparta el paso antes de mandar: si dos corridas se cruzan, solo una lo manda.
    const { data: apartado, error: e1 } = await sb.from("whatsapp_mensajes")
      .upsert({ agencia_id: ag, prospecto_id: p.id, paso: d.paso, plantilla: plantillas[d.paso], estado: "enviando" }, { onConflict: "prospecto_id,paso", ignoreDuplicates: true })
      .select("id");
    if (e1) { fallas.push(`${p.id}: ${e1.message}`); continue; }
    if (!apartado?.length) continue;
    // Plantillas del seguimiento: {{1}} nombre del cliente, {{2}} asesor.
    const r = await enviarPlantilla({ telefono: p.tel, nombre: plantillas[d.paso], variables: [p.nombre.split(/\s+/)[0]!, corto.get(p.asesor_id) ?? "tu asesor"] });
    await sb.from("whatsapp_mensajes").update(r.ok ? { estado: "enviado", wa_id: r.id } : { estado: "fallido", error: r.error.slice(0, 300) }).eq("id", apartado[0].id);
    if (r.ok) enviados++;
    else fallas.push(`${p.id} (${d.paso}): ${r.error}`);
  }
  if (simular) return Response.json({ ok: true, fecha, porEnviar, detenidos: motivos });
  return Response.json({ ok: !fallas.length, fecha, enviados, detenidos: motivos, fallas });
}
