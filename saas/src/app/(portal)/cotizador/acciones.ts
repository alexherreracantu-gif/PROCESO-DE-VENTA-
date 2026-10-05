"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requerirSesion } from "@/lib/sesion";
import { hoy } from "@/lib/dominio/fechas";
import type { Resultado } from "@/lib/tipos";

const Entrada = z.object({
  responsableId: z.string().regex(/^[0-9a-f-]{36}$/i),
  nombre: z.string().trim().min(2, "Escribe el nombre del cliente.").max(120),
  telefono: z.string().trim().max(20).optional().nullable(),
  modeloId: z.string().regex(/^[0-9a-f-]{36}$/i),
  enganche: z.number().nonnegative().max(20_000_000),
  resumen: z.string().trim().min(1).max(1500),
});

/**
 * Guarda la cotización en el CRM: si el cliente ya es prospecto (mismo teléfono) se le agrega la
 * cotización a sus notas; si no, se crea en etapa "Cotizado" a nombre del responsable.
 */
export async function guardarCotizacion(e: z.input<typeof Entrada>): Promise<Resultado> {
  const s = await requerirSesion();
  const r = Entrada.safeParse(e);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Revisa los datos." };
  const d = r.data;
  if (!s.direccion && d.responsableId !== s.perfil.id) return { ok: false, error: "Solo puedes guardar cotizaciones a tu nombre." };
  const tel = (d.telefono ?? "").replace(/\D/g, "").replace(/^52(?=\d{10}$)/, "");
  const nota = `— Cotización ${hoy()} —\n${d.resumen}`;
  if (tel.length === 10) {
    const { data: previo } = await s.sb.from("prospectos").select("id, notas, etapa").eq("agencia_id", s.agencia.id).eq("telefono", tel).order("created_at", { ascending: false }).limit(1).maybeSingle<{ id: string; notas: string | null; etapa: string }>();
    if (previo) {
      const etapa = ["nuevo", "contactado", "cita", "prueba"].includes(previo.etapa) ? "cotizado" : previo.etapa;
      const { error } = await s.sb.from("prospectos").update({ notas: [previo.notas, nota].filter(Boolean).join("\n").slice(-2000), modelo_id: d.modeloId, enganche: d.enganche, etapa, siguiente_accion: "Dar seguimiento a la cotización", fecha_siguiente: hoy() }).eq("id", previo.id);
      if (error) return { ok: false, error: "No se pudo guardar: " + error.message };
      revalidatePath("/crm");
      return { ok: true, id: previo.id, mensaje: "Cotización agregada al prospecto" };
    }
  }
  const { data, error } = await s.sb.from("prospectos").insert({
    agencia_id: s.agencia.id, asesor_id: d.responsableId, nombre: d.nombre, telefono: tel.length === 10 ? tel : null, modelo_id: d.modeloId,
    etapa: "cotizado", origen: "Park Point", calor: "media", enganche: d.enganche, notas: nota,
    siguiente_accion: "Dar seguimiento a la cotización", fecha_siguiente: hoy(),
  }).select("id").single();
  if (error || !data) return { ok: false, error: "No se pudo guardar: " + (error?.message ?? "") };
  revalidatePath("/crm");
  return { ok: true, id: data.id, mensaje: "Prospecto creado con la cotización" };
}
