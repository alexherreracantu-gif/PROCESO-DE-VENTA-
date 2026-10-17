"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sesionPanel } from "@/lib/panel";
import { esRobot, normalizarLead } from "@/lib/dominio/leads";
import { ahorroFlotilla, resumenFlotilla, TIPOS_FLOTILLA } from "@/lib/dominio/flotillas";
import { registrarLead } from "@/lib/leads-servidor";
import { enviarPlantilla, whatsappListo } from "@/lib/whatsapp";
import { dinero } from "@/lib/dominio/formato";

const Entrada = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre.").max(80),
  organizacion: z.string().trim().min(2, "Escribe el nombre de tu empresa, fraccionamiento o municipio.").max(120),
  tipo: z.enum(TIPOS_FLOTILLA),
  unidades: z.number().int().min(2, "Una flotilla es de 2 unidades o más.").max(5000),
  kmDia: z.number().min(0).max(2000),
  telefono: z.string().trim().max(20),
  correo: z.string().trim().max(120).email("Revisa tu correo.").or(z.literal("")),
  aceptaWhatsapp: z.boolean(),
  asesor: z.string().max(40).nullable(),
  foto: z.string().max(200).nullable(),
  sitio_web: z.string().max(200).optional(),
  t: z.number().optional(),
});

/**
 * Prospecto de flotilla desde la landing: se guarda en el CRM (con el asesor del enlace o por turno) y,
 * si el cliente lo aceptó y WhatsApp Business está configurado, se le manda en automático la plantilla
 * con imagen y se avisa al asesor. Los envíos van después de responder, para no hacer esperar al cliente.
 */
export async function enviarFlotilla(e: z.input<typeof Entrada>): Promise<{ ok: true; telefono: string | null; asesor: string | null; whatsapp: boolean } | { ok: false; error: string }> {
  const r = Entrada.safeParse(e);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Revisa tus datos." };
  const d = r.data;
  if (esRobot({ sitio_web: d.sitio_web ?? "", t: d.t != null ? String(Math.round(d.t)) : "" })) return { ok: true, telefono: null, asesor: null, whatsapp: false };
  const s = await sesionPanel();
  if (!s) return { ok: false, error: "La página no está disponible por ahora. Escríbenos por WhatsApp." };

  const ahorro = ahorroFlotilla(d.unidades, d.kmDia);
  const resumen = resumenFlotilla(d, ahorro);
  const lead = normalizarLead({ nombre: d.nombre, telefono: d.telefono, origen: "Landing flotillas" });
  if ("error" in lead) return { ok: false, error: lead.error };
  lead.origen = "Landing flotillas";
  lead.calor = d.unidades >= 5 ? "alta" : "media";
  lead.notas = [resumen.notas, d.aceptaWhatsapp ? "Aceptó recibir la propuesta por WhatsApp." : "No aceptó mensajes automáticos de WhatsApp."].join("\n");

  let asesorId: string | null = null;
  if (d.asesor) {
    const { data } = await supabaseAdmin().from("perfiles").select("id").eq("agencia_id", s.agencia.id).eq("usuario", d.asesor.toLowerCase()).eq("activo", true).maybeSingle();
    asesorId = data?.id ?? null;
  }
  const datos = {
    flotilla: {
      tipo: d.tipo, organizacion: d.organizacion, unidades: d.unidades, kmDia: d.kmDia, correo: d.correo || null,
      ahorroElectrico: Math.round(ahorro.electrico.ahorroAnual), ahorroHibrido: Math.round(ahorro.hibrido.ahorroAnual),
      aceptaWhatsapp: d.aceptaWhatsapp, fecha: new Date().toISOString(),
    },
  };
  const res = await registrarLead(lead, { agenciaId: s.agencia.id, asesorId, datos });
  if (!res.ok) return { ok: false, error: res.status === 429 ? res.error : "No se pudo enviar. Escríbenos por WhatsApp." };
  const { data: a } = await supabaseAdmin().from("perfiles").select("nombre_corto, telefono").eq("id", res.asesor_id).maybeSingle();
  // Volver a marcar la casilla es un consentimiento nuevo: si antes había pedido BAJA, se quita.
  if (d.aceptaWhatsapp) await supabaseAdmin().from("whatsapp_bajas").delete().eq("agencia_id", s.agencia.id).eq("telefono", lead.telefono);

  const automatico = d.aceptaWhatsapp && whatsappListo() && !!process.env.WHATSAPP_PLANTILLA_FLOTILLA;
  if (automatico || (whatsappListo() && process.env.WHATSAPP_PLANTILLA_ASESOR && a?.telefono)) {
    const h = await headers();
    const sitio = process.env.SITIO_URL || `https://${h.get("x-forwarded-host") ?? h.get("host")}`;
    const imagen = d.foto && /^\/modelos\/[a-z0-9-]+\.jpg$/.test(d.foto) ? `${sitio}${d.foto}` : null;
    const primerNombre = d.nombre.split(/\s+/)[0]!;
    after(async () => {
      if (automatico) {
        // Plantilla del cliente: {{1}} nombre, {{2}} unidades, {{3}} ahorro estimado al año, {{4}} asesor.
        const envio = await enviarPlantilla({ telefono: lead.telefono, nombre: process.env.WHATSAPP_PLANTILLA_FLOTILLA!, imagen,
          variables: [primerNombre, String(d.unidades), dinero(resumen.mejor), a?.nombre_corto ?? "tu asesor"] });
        if (!envio.ok) console.error("WhatsApp al cliente:", envio.error);
        // Queda en la bitácora del seguimiento (los días 1, 3, 7 y 14 los manda /api/cron/seguimiento-flotillas).
        await supabaseAdmin().from("whatsapp_mensajes").upsert({
          agencia_id: s.agencia.id, prospecto_id: res.id, paso: "bienvenida", plantilla: process.env.WHATSAPP_PLANTILLA_FLOTILLA!,
          ...(envio.ok ? { estado: "enviado", wa_id: envio.id } : { estado: "fallido", error: envio.error.slice(0, 300) }),
        }, { onConflict: "prospecto_id,paso", ignoreDuplicates: true });
      }
      if (process.env.WHATSAPP_PLANTILLA_ASESOR && a?.telefono) {
        // Plantilla del asesor: {{1}} cliente, {{2}} organización y tipo, {{3}} unidades, {{4}} WhatsApp del cliente.
        const aviso = await enviarPlantilla({ telefono: a.telefono, nombre: process.env.WHATSAPP_PLANTILLA_ASESOR,
          variables: [d.nombre, `${d.organizacion} (${d.tipo.toLowerCase()})`, String(d.unidades), lead.telefono] });
        if (!aviso.ok) console.error("WhatsApp al asesor:", aviso.error);
      }
    });
  }
  return { ok: true, telefono: a?.telefono ?? null, asesor: a?.nombre_corto ?? null, whatsapp: automatico };
}
