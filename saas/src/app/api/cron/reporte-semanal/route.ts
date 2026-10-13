import { sesionPanel } from "@/lib/panel";
import { cronAutorizado, enviarCorreo, urlPortal } from "@/lib/cron";
import { enviarPlantilla, whatsappListo } from "@/lib/whatsapp";
import { esDireccion, type Etapa, type Rol } from "@/lib/dominio/catalogos";
import { hoy, nombreMes, rangoMes, sumarDias } from "@/lib/dominio/fechas";
import {
  ORIGENES_FLOTILLA, PASOS, correoReporte, embudo, focoSemana, semanaPasada, textoRango, variablesWhatsappReporte,
  type DatosReporte, type EventoEtapa,
} from "@/lib/dominio/reporte-semanal";

/**
 * Reporte de cada lunes (Vercel Cron, ver vercel.json): embudo de la semana pasada por correo a cada
 * quien (dirección recibe el de la agencia y el de cada asesor) y, si está configurado, por WhatsApp.
 * Necesita CRON_SECRET y RESEND_API_KEY (ver src/lib/cron.ts). Para WhatsApp: WHATSAPP_PLANTILLA_REPORTE
 * y REPORTE_WHATSAPP con los usuarios que lo pidieron (ej. "alex,jorge"); sale a su teléfono de Mi perfil.
 *
 * Para probar sin esperar al lunes: ?simular=1 (no manda nada, solo regresa los números),
 * ?para=<usuario> (solo a esa persona) y ?fecha=AAAA-MM-DD (reporta la semana anterior a esa fecha).
 */
type Persona = { id: string; usuario: string; nombre: string; nombre_corto: string; rol: Rol; vende: boolean; correo: string | null; telefono: string | null };
type FilaEvento = { prospecto_id: string; de: Etapa | null; a: Etapa; created_at: string; prospectos: { asesor_id: string; origen: string; unidades: unknown } | null };
type Evento = EventoEtapa & { asesor: string; flotilla: boolean; unidades: number };

const LOTE = 1000;

export async function GET(request: Request) {
  if (!cronAutorizado(request)) return Response.json({ ok: false, error: "No autorizado." }, { status: 401 });
  const q = new URL(request.url).searchParams;
  const simular = q.get("simular") === "1";
  const para = q.get("para")?.toLowerCase() || null;
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(q.get("fecha") ?? "") ? q.get("fecha")! : hoy();

  const llave = process.env.RESEND_API_KEY;
  const plantilla = whatsappListo() ? process.env.WHATSAPP_PLANTILLA_REPORTE || null : null;
  const listaWa = new Set((process.env.REPORTE_WHATSAPP ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean));
  if (!simular && !llave && !plantilla) return Response.json({ ok: false, error: "Falta RESEND_API_KEY (o WhatsApp con WHATSAPP_PLANTILLA_REPORTE): el reporte semanal está apagado." });
  const s = await sesionPanel();
  if (!s) return Response.json({ ok: false, error: "No hay agencia." }, { status: 500 });

  const sem = semanaPasada(fecha);
  const rango = textoRango(sem.desde, sem.hasta);
  const mes = fecha.slice(0, 7);

  // Historial de etapas de las dos semanas (un día de colchón por la zona horaria; luego se filtra por fecha de Monterrey).
  const filas: FilaEvento[] = [];
  for (let i = 0; ; i += LOTE) {
    const { data, error } = await s.sb.from("prospecto_etapas")
      .select("prospecto_id, de, a, created_at, prospectos(asesor_id, origen, unidades:datos->flotilla->unidades)")
      .eq("agencia_id", s.agencia.id).gte("created_at", `${sumarDias(sem.previaDesde, -1)}T00:00:00Z`).lt("created_at", `${sumarDias(sem.hasta, 2)}T00:00:00Z`)
      .order("id").range(i, i + LOTE - 1);
    if (error) return Response.json({ ok: false, error: `No se pudo leer el historial de etapas: ${error.message}` }, { status: 500 });
    filas.push(...((data ?? []) as unknown as FilaEvento[]));
    if (!data || data.length < LOTE) break;
  }
  const eventos: Evento[] = filas.flatMap((r) => r.prospectos ? [{
    prospecto_id: r.prospecto_id, de: r.de, a: r.a, fecha: hoy(new Date(r.created_at)),
    asesor: r.prospectos.asesor_id, flotilla: ORIGENES_FLOTILLA.includes(r.prospectos.origen), unidades: Math.max(0, Math.round(Number(r.prospectos.unidades) || 0)),
  }] : []);
  const semana = eventos.filter((e) => e.fecha >= sem.desde && e.fecha <= sem.hasta);
  const previa = eventos.filter((e) => e.fecha >= sem.previaDesde && e.fecha <= sem.previaHasta);

  const [gente, nuevos, ventas] = await Promise.all([
    s.sb.from("perfiles").select("id, usuario, nombre, nombre_corto, rol, vende, correo, telefono").eq("agencia_id", s.agencia.id).eq("activo", true),
    // Sin contactar: siguen en "nuevo" después de un día.
    s.sb.from("prospectos").select("asesor_id, nombre, created_at").eq("agencia_id", s.agencia.id).eq("etapa", "nuevo")
      .lt("created_at", new Date(Date.now() - 86_400_000).toISOString()).order("created_at").limit(LOTE),
    s.sb.from("ventas").select("vendedor_id").eq("agencia_id", s.agencia.id).neq("estatus", "cancelada").gte("fecha", rangoMes(mes).desde).lte("fecha", fecha).limit(5000),
  ]);
  const personas = (gente.data ?? []) as Persona[];
  const corto = new Map(personas.map((p) => [p.id, p.nombre_corto]));
  const pendientes = (nuevos.data ?? []) as { asesor_id: string; nombre: string; created_at: string }[];
  const unidadesDe = (id: string) => ((ventas.data ?? []) as { vendedor_id: string }[]).filter((v) => v.vendedor_id === id).length;
  const vendedores = personas.filter((p) => p.vende);
  const portal = `${urlPortal(request)}/crm`;

  const enviados: { correo: string[]; whatsapp: string[] } = { correo: [], whatsapp: [] }, fallas: string[] = [], simulado: object[] = [];
  for (const p of personas) {
    if (para && p.usuario !== para) continue;
    const direccion = esDireccion(p.rol);
    if (!direccion && !p.vende) continue;
    const mio = (e: Evento) => direccion || e.asesor === p.id;
    const mios = semana.filter(mio), antes = previa.filter(mio);
    const sinContactar = pendientes.filter((x) => direccion || x.asesor_id === p.id).map((x) => ({
      cliente: direccion ? `${x.nombre} (${corto.get(x.asesor_id) ?? "sin asesor"})` : x.nombre,
      dias: Math.max(1, Math.floor((Date.now() - new Date(x.created_at).getTime()) / 86_400_000)),
    }));
    const unidadesMes = unidadesDe(p.id);
    // Quien no movió nada en dos semanas, no tiene pendientes ni ventas: no se le manda un reporte vacío.
    if (!direccion && !mios.length && !antes.length && !sinContactar.length && !unidadesMes) continue;

    const flot = mios.filter((e) => e.flotilla);
    const e = embudo(mios);
    const datos: DatosReporte = {
      nombre: p.nombre, rango, portal,
      embudo: e, anterior: embudo(antes),
      flotillas: { embudo: embudo(flot), unidades: [...new Map(flot.filter((x) => x.de === null).map((x) => [x.prospecto_id, x.unidades])).values()].reduce((t, u) => t + u, 0) },
      mes: p.vende ? { nombre: nombreMes(mes).split(" ")[0], unidades: unidadesMes } : null,
      sinContactar,
      equipo: direccion
        ? vendedores.map((v) => ({ nombre: v.nombre_corto, embudo: embudo(semana.filter((x) => x.asesor === v.id)), unidadesMes: unidadesDe(v.id) }))
          .sort((a, b) => b.unidadesMes - a.unidadesMes || b.embudo.cierres - a.embudo.cierres || b.embudo.propuestas - a.embudo.propuestas)
        : null,
      foco: focoSemana(e, sinContactar.length),
    };
    const porWhatsapp = !!(plantilla && p.telefono && listaWa.has(p.usuario));

    if (simular) {
      simulado.push({ usuario: p.usuario, ...Object.fromEntries(PASOS.map((x) => [x.id, e[x.id]])), sinContactar: sinContactar.length, unidadesMes, correo: !!(llave && p.correo), whatsapp: porWhatsapp });
      continue;
    }
    if (llave && p.correo) (await enviarCorreo(llave, { para: p.correo, ...correoReporte(datos) }) ? enviados.correo : fallas).push(p.nombre);
    if (porWhatsapp) {
      const r = await enviarPlantilla({ telefono: p.telefono!, nombre: plantilla!, variables: variablesWhatsappReporte(datos) });
      if (r.ok) enviados.whatsapp.push(p.nombre);
      else fallas.push(`${p.nombre} (WhatsApp: ${r.error})`);
    }
  }
  if (simular) return Response.json({ ok: true, semana: rango, personas: simulado });
  return Response.json({ ok: !fallas.length, semana: rango, enviados, fallas });
}
