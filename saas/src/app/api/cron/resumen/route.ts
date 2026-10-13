import { catalogo, ventasConEntrega, ventasEnProceso } from "@/lib/datos";
import { sesionPanel } from "@/lib/panel";
import { cronAutorizado, enviarCorreo, urlPortal } from "@/lib/cron";
import { procesoDeVenta } from "@/lib/dominio/proceso";
import { pendientesUrgentes } from "@/lib/dominio/seguimiento";
import { correoResumen } from "@/lib/dominio/resumen";
import { fechaLarga, hoy, sumarDias } from "@/lib/dominio/fechas";
import { esDireccion } from "@/lib/dominio/catalogos";

/**
 * Resumen de cada mañana por correo (Vercel Cron, ver vercel.json). Necesita CRON_SECRET y
 * RESEND_API_KEY en Vercel (ver src/lib/cron.ts). Cada quien pone su correo en Mi perfil.
 */
export async function GET(request: Request) {
  if (!cronAutorizado(request)) return Response.json({ ok: false, error: "No autorizado." }, { status: 401 });
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
  const portal = urlPortal(request);

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
    (await enviarCorreo(llave, { para: p.correo, ...correo }) ? enviados : fallas).push(p.nombre);
  }
  return Response.json({ ok: !fallas.length, enviados, fallas });
}
