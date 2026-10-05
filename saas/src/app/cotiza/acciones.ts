"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sesionPanel } from "@/lib/panel";
import { catalogo } from "@/lib/datos";
import { cotizar, PLAZOS } from "@/lib/dominio/banorte";
import { esRobot, normalizarLead } from "@/lib/dominio/leads";
import { dinero, dinero2 } from "@/lib/dominio/formato";
import { registrarLead } from "@/lib/leads-servidor";

const Entrada = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre.").max(80),
  telefono: z.string().trim().max(20),
  modeloId: z.string().regex(/^[0-9a-f-]{36}$/i),
  contado: z.boolean(),
  aportacion: z.number().nonnegative().max(20_000_000),
  plazo: z.number().int(),
  garantia: z.boolean(),
  cuando: z.enum(["Este mes", "En 1 a 3 meses", "Solo estoy viendo"]),
  toma: z.boolean(),
  asesor: z.string().max(40).nullable(),
  sitio_web: z.string().max(200).optional(),
  t: z.number().optional(),
});

/**
 * El cliente pide su cotización: se guarda como prospecto en el CRM (con el asesor del enlace o por turno)
 * y se devuelve el WhatsApp del asesor para que le escriba. Los números se recalculan aquí, no se confía en el navegador.
 */
export async function enviarCotizacion(e: z.input<typeof Entrada>): Promise<{ ok: true; telefono: string | null; asesor: string | null } | { ok: false; error: string }> {
  const r = Entrada.safeParse(e);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Revisa tus datos." };
  const d = r.data;
  if (esRobot({ sitio_web: d.sitio_web ?? "", t: d.t != null ? String(Math.round(d.t)) : "" })) return { ok: true, telefono: null, asesor: null };
  const s = await sesionPanel();
  if (!s) return { ok: false, error: "El cotizador no está disponible por ahora." };
  const { modelos } = await catalogo(s);
  const m = modelos.find((x) => x.id === d.modeloId);
  if (!m) return { ok: false, error: "Elige un modelo." };
  const pa = s.agencia.parametros;
  const plazo = (PLAZOS as readonly number[]).includes(d.plazo) ? d.plazo : 72;
  const q = cotizar({ modelo: m, aportacion: d.aportacion, accesorios: 0, garantia: d.garantia ? pa.garantia_extendida ?? 9082 : 0, plazo, placas: m.motor === "electrico" ? pa.placas_electrico ?? 1760 : pa.placas_hibrido ?? 5866, tramites: 0 });

  const lead = normalizarLead({
    nombre: d.nombre, telefono: d.telefono, modelo: m.nombre, origen: "Cotizador web", cuando: d.cuando, pago: d.contado ? "Contado" : "Financiado",
    enganche: d.contado ? "" : dinero(d.aportacion),
    mensaje: d.contado
      ? `Cotizó de contado: ${dinero(m.precio)}.${d.toma ? " Trae auto a cuenta." : ""}`
      : `Cotizó: aporta ${dinero(d.aportacion)}${q.bonoAplica ? ` + bono ${dinero(q.bono)}` : ""}, ${plazo} meses, mensualidad ${dinero2(q.mensualidad)} (tasa ${(q.convenio.tasa * 100).toFixed(2)}%)${d.garantia ? ", con garantía extendida" : ""}.${d.toma ? " Trae auto a cuenta." : ""}`,
  });
  if ("error" in lead) return { ok: false, error: lead.error };
  lead.origen = "Cotizador web";
  if (d.cuando === "Este mes") lead.calor = "alta";

  let asesorId: string | null = null;
  if (d.asesor) {
    const { data } = await supabaseAdmin().from("perfiles").select("id").eq("agencia_id", s.agencia.id).eq("usuario", d.asesor.toLowerCase()).eq("activo", true).maybeSingle();
    asesorId = data?.id ?? null;
  }
  const res = await registrarLead(lead, { agenciaId: s.agencia.id, asesorId });
  if (!res.ok) return { ok: false, error: res.status === 429 ? res.error : "No se pudo enviar. Escríbenos por WhatsApp." };
  const { data: a } = await supabaseAdmin().from("perfiles").select("nombre_corto, telefono").eq("id", res.asesor_id).maybeSingle();
  return { ok: true, telefono: a?.telefono ?? null, asesor: a?.nombre_corto ?? null };
}
