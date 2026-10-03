import { timingSafeEqual } from "node:crypto";
import { catalogo, ventasConEntrega, ventasEnProceso } from "@/lib/datos";
import { sesionPanel } from "@/lib/panel";
import { procesoDeVenta } from "@/lib/dominio/proceso";
import { pendientesUrgentes } from "@/lib/dominio/seguimiento";
import { correoResumen } from "@/lib/dominio/resumen";
import { fechaLarga, hoy, sumarDias } from "@/lib/dominio/fechas";
import { esDireccion } from "@/lib/dominio/catalogos";

/**
 * Resumen de cada mañana por correo (Vercel Cron, ver vercel.json). Necesita en Vercel:
 *  · CRON_SECRET: Vercel lo manda solo en "Authorization: Bearer …".
 *  · RESEND_API_KEY: cuenta gratis en resend.com.
 *  · RESUMEN_REMITENTE (opcional): "Park Point <avisos@tudominio.com>". Sin dominio propio,
 *    Resend solo deja mandar al correo con el que se abrió la cuenta.
 * Cada quien pone su correo en Mi perfil.
 */
function autorizado(request: Request) {
  const esperado = process.env.CRON_SECRET;
  if (!esperado) return false;
  const a = Buffer.from(request.headers.get("authorization") ?? ""), b = Buffer.from(`Bearer ${esperado}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!autorizado(request)) return Response.json({ ok: false, error: "No autorizado." }, { status: 401 });
  const llave = process.env.RESEND_API_KEY;
  if (!llave) return Response.json({ ok: false, error: "Falta RESEND_API_KEY: el resumen por correo está apagado." });
  const s = await sesionPanel();
  if (!s) return Response.json({ ok: false, error: "No hay agencia." }, { status: 500 });

  const fecha = hoy();
  const [cat, abiertas, entregadas, gente, seg] = await Promise.all([
    catalogo(s, true), ventasEnProceso(s), ventasConEntrega(s, sumarDias(fecha, -200), fecha),
    s.sb.from("perfiles").select("id, nombre, rol, correo").eq("agencia_id", s.agencia.id).eq("activo", true).not("correo", "is", null),
    s.sb.from("prospectos").select("asesor_id").eq("agencia_id", s.agencia.id).lte("fecha_siguiente", fecha).not("etapa", "in", "(entregado,referidor,perdido)"),
  ]);
  const urgentes = pendientesUrgentes(abiertas, entregadas, (v) => procesoDeVenta(v, cat.productos), s.agencia.nombre, fecha);
  const portal = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : new URL(request.url).origin;
  const remitente = process.env.RESUMEN_REMITENTE || "Park Point <onboarding@resend.dev>";

  const enviados: string[] = [], fallas: string[] = [];
  for (const p of (gente.data ?? []) as { id: string; nombre: string; rol: "ceo" | "gerente" | "asesor"; correo: string }[]) {
    const todos = esDireccion(p.rol);
    const mios = urgentes.filter((u) => todos || u.vendedor === p.id);
    const correo = correoResumen({
      nombre: p.nombre, fecha: fechaLarga(fecha), portal: `${portal}/inicio`,
      puntos: mios.map((u) => ({ cliente: u.cliente, texto: u.texto, grave: u.grave, enlace: `${portal}/ventas/${u.ventaId}` })),
      entregasHoy: abiertas.filter((v) => v.fecha_entrega === fecha && (todos || v.vendedor_id === p.id)).length,
      seguimientos: (seg.data ?? []).filter((x) => x.asesor_id === p.id).length,
    });
    if (!correo) continue;
    const r = await fetch(`${process.env.RESEND_API_URL ?? "https://api.resend.com"}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${llave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: remitente, to: [p.correo], subject: correo.asunto, html: correo.html, text: correo.texto }),
    }).catch(() => null);
    (r?.ok ? enviados : fallas).push(p.nombre);
  }
  return Response.json({ ok: !fallas.length, enviados, fallas });
}
