import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buscarModelo, elegirAsesor, type LeadEntrante } from "@/lib/dominio/leads";
import { hoy } from "@/lib/dominio/fechas";

export type ResultadoLead = { ok: true; id: string; asesor_id: string; duplicado?: boolean } | { ok: false; error: string; status: number };

/**
 * Guarda un prospecto que llega de fuera (landing, Meta, cotizador público) y lo asigna:
 * al asesor indicado si viene uno, o por turno al que menos prospectos lleva hoy.
 * Si el teléfono ya llegó en los últimos 30 días, se suma la nota al mismo prospecto.
 */
export async function registrarLead(lead: LeadEntrante, opciones: { agenciaId?: string | null; asesorId?: string | null } = {}): Promise<ResultadoLead> {
  const admin = supabaseAdmin();
  const agenciaId = opciones.agenciaId ?? (await admin.from("agencias").select("id").order("created_at").limit(1).single()).data?.id;
  if (!agenciaId) return { ok: false, error: "No hay agencia configurada.", status: 500 };

  // Freno contra avalanchas: más de 30 prospectos en 10 minutos no es tráfico normal.
  const { count: ultimos } = await admin.from("prospectos").select("id", { count: "exact", head: true }).eq("agencia_id", agenciaId).gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString());
  if ((ultimos ?? 0) >= 30) return { ok: false, error: "Demasiados prospectos seguidos. Intenta en unos minutos.", status: 429 };

  const hace30 = new Date(Date.now() - 30 * 864e5).toISOString();
  const { data: previo } = await admin.from("prospectos").select("id, asesor_id, notas").eq("agencia_id", agenciaId).eq("telefono", lead.telefono).gte("created_at", hace30).limit(1).maybeSingle();
  if (previo) {
    await admin.from("prospectos").update({ notas: [previo.notas, `— Volvió a escribir (${hoy()}) —`, lead.notas].filter(Boolean).join("\n").slice(0, 2000), fecha_siguiente: hoy(), calor: "alta" }).eq("id", previo.id);
    return { ok: true, id: previo.id, asesor_id: previo.asesor_id, duplicado: true };
  }

  const [{ data: asesores }, { data: modelos }, { data: recientes }] = await Promise.all([
    admin.from("perfiles").select("id").eq("agencia_id", agenciaId).eq("activo", true).eq("rol", "asesor").eq("vende", true),
    admin.from("modelos").select("id, nombre").eq("agencia_id", agenciaId).eq("activo", true),
    admin.from("prospectos").select("asesor_id, created_at").eq("agencia_id", agenciaId).gte("created_at", hace30),
  ]);
  let asesor = opciones.asesorId ?? null;
  if (!asesor) {
    const inicioHoy = new Date(`${hoy()}T00:00:00-06:00`);
    const conteo = (asesores ?? []).map((a) => {
      const suyos = (recientes ?? []).filter((r) => r.asesor_id === a.id);
      return { id: a.id as string, total: suyos.length, hoy: suyos.filter((r) => new Date(r.created_at) >= inicioHoy).length };
    });
    asesor = elegirAsesor(conteo);
  }
  if (!asesor) return { ok: false, error: "No hay asesores activos para asignar.", status: 500 };
  const modelo = buscarModelo(lead.modelo, (modelos ?? []) as { id: string; nombre: string }[]);

  const { data, error } = await admin.from("prospectos").insert({
    agencia_id: agenciaId, asesor_id: asesor, nombre: lead.nombre, telefono: lead.telefono, modelo_id: modelo?.id ?? null,
    origen: lead.origen, calor: lead.calor, etapa: "nuevo", fecha_siguiente: hoy(), siguiente_accion: "Contactar por WhatsApp en menos de 5 minutos",
    notas: [lead.modelo && !modelo ? `Modelo que pidió: ${lead.modelo}` : null, lead.notas].filter(Boolean).join("\n") || null,
  }).select("id").single();
  if (error || !data) return { ok: false, error: "No se pudo guardar: " + (error?.message ?? ""), status: 500 };
  return { ok: true, id: data.id, asesor_id: asesor };
}
