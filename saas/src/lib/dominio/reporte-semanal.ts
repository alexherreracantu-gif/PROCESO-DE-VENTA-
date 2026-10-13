/**
 * Reporte de cada lunes: el embudo de la semana pasada (nuevos → contactados → citas → propuestas →
 * cierres) contado con el historial de etapas, comparado contra la semana anterior, con lo de
 * flotillas aparte, cómo va el mes contra los escalones de comisión y un foco para la semana.
 */
import type { Etapa } from "./catalogos";
import { MESES, sumarDias } from "./fechas";

export const PASOS = [
  { id: "nuevos", label: "Prospectos nuevos", corto: "Nuevos", nivel: 0 },
  { id: "contactados", label: "Contactados", corto: "Contact.", nivel: 1 },
  { id: "citas", label: "Citas o pruebas de manejo", corto: "Citas", nivel: 2 },
  { id: "propuestas", label: "Propuestas o cotizaciones", corto: "Propuestas", nivel: 4 },
  { id: "cierres", label: "Cierres (apartado o entrega)", corto: "Cierres", nivel: 6 },
] as const;
export type PasoId = (typeof PASOS)[number]["id"];
export type Embudo = Record<PasoId, number> & { perdidos: number };

/** Qué tan avanzada está cada etapa. Referidor y perdido quedan fuera del camino. */
const NIVEL: Partial<Record<Etapa, number>> = { nuevo: 0, contactado: 1, cita: 2, prueba: 3, cotizado: 4, credito: 5, apartado: 6, entregado: 7 };

/** Origen de los prospectos que cuentan como flotilla. */
export const ORIGENES_FLOTILLA = ["Landing flotillas", "Flotilla"];

/** Escalones de comisión de la agencia: con 7 unidades en el mes se paga más por todas; con 13, más todavía. */
export const ESCALONES = [7, 13];

/** Un cambio de etapa (prospecto_etapas). `de` es null cuando el prospecto entró al CRM. */
export type EventoEtapa = { prospecto_id: string; de: Etapa | null; a: Etapa; fecha: string };

export function embudoVacio(): Embudo {
  return { nuevos: 0, contactados: 0, citas: 0, propuestas: 0, cierres: 0, perdidos: 0 };
}

/**
 * Cuántos prospectos distintos cruzaron cada paso. Un salto de "nuevo" a "cotizado" cuenta como
 * contactado, cita y propuesta; uno que se había perdido y vuelve a cita cuenta otra vez como cita.
 */
export function embudo(eventos: EventoEtapa[]): Embudo {
  const vistos: Record<PasoId | "perdidos", Set<string>> = { nuevos: new Set(), contactados: new Set(), citas: new Set(), propuestas: new Set(), cierres: new Set(), perdidos: new Set() };
  for (const e of eventos) {
    if (e.a === "perdido") vistos.perdidos.add(e.prospecto_id);
    if (e.de === null) vistos.nuevos.add(e.prospecto_id);
    const a = NIVEL[e.a];
    if (a === undefined) continue;
    const de = e.de === null ? -1 : NIVEL[e.de] ?? -1;
    for (const p of PASOS) if (p.nivel > 0 && a >= p.nivel && de < p.nivel) vistos[p.id].add(e.prospecto_id);
  }
  return { nuevos: vistos.nuevos.size, contactados: vistos.contactados.size, citas: vistos.citas.size, propuestas: vistos.propuestas.size, cierres: vistos.cierres.size, perdidos: vistos.perdidos.size };
}

/** La semana completa (lunes a domingo) anterior a `fecha`, y la de antes para comparar. */
export function semanaPasada(fecha: string) {
  const dia = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  const lunes = sumarDias(fecha, -((dia + 6) % 7));
  const desde = sumarDias(lunes, -7), hasta = sumarDias(lunes, -1);
  return { desde, hasta, previaDesde: sumarDias(desde, -7), previaHasta: sumarDias(hasta, -7) };
}

/** "12 al 18 de octubre" o "28 de septiembre al 4 de octubre". */
export function textoRango(desde: string, hasta: string) {
  const [, m1, d1] = desde.split("-").map(Number), [, m2, d2] = hasta.split("-").map(Number);
  return m1 === m2 ? `${d1} al ${d2} de ${MESES[m2 - 1]}` : `${d1} de ${MESES[m1 - 1]} al ${d2} de ${MESES[m2 - 1]}`;
}

/** Unidades del mes contra los escalones de comisión. */
export function textoEscalon(unidades: number) {
  const siguiente = ESCALONES.find((x) => unidades < x);
  if (siguiente === undefined) return `${unidades} (ya estás en el escalón de ${ESCALONES[ESCALONES.length - 1]}+)`;
  return `${unidades} (te faltan ${siguiente - unidades} para ${siguiente})`;
}

/** Una sola acción para la semana, según dónde se atora el embudo. */
export function focoSemana(e: Embudo, sinContactar: number) {
  if (sinContactar > 0) return `Tienes ${sinContactar} ${sinContactar === 1 ? "prospecto" : "prospectos"} sin contactar: escríbeles hoy antes de las 12, el que contesta primero gana.`;
  if (!e.nuevos && !e.contactados) return "No entraron prospectos: comparte tu landing y tu QR, y publica un video diario de piso.";
  if (e.contactados >= 3 && e.citas * 3 < e.contactados) return "Convierte más contactos en cita: ofrece dos horarios concretos para prueba de manejo.";
  if (e.citas >= 2 && e.propuestas * 2 < e.citas) return "Después de cada prueba de manejo deja la cotización por escrito el mismo día.";
  if (e.propuestas >= 2 && !e.cierres) return "Llama a cada propuesta abierta esta semana (no solo WhatsApp) y pregunta qué falta para decidir.";
  return "Vas bien: repite lo que funcionó y pide dos referidos a cada cliente que compró.";
}

export type FilaEquipo = { nombre: string; embudo: Embudo; unidadesMes: number };
export type DatosReporte = {
  nombre: string;
  rango: string;
  portal: string;
  embudo: Embudo;
  anterior: Embudo;
  flotillas: { embudo: Embudo; unidades: number };
  /** Solo para quien vende. */
  mes: { nombre: string; unidades: number } | null;
  sinContactar: { cliente: string; dias: number }[];
  /** Solo para dirección: cada asesor. */
  equipo: FilaEquipo[] | null;
  foco: string;
};

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

function cambio(ahora: number, antes: number) {
  if (ahora === antes) return { txt: "=", color: "#5b6472" };
  return ahora > antes ? { txt: `▲${ahora - antes}`, color: "#067647" } : { txt: `▼${antes - ahora}`, color: "#b42318" };
}

function tablaEmbudo(e: Embudo, antes: Embudo | null) {
  const max = Math.max(1, ...PASOS.map((p) => e[p.id]));
  return `<table style="width:100%;border-collapse:collapse">${PASOS.map((p) => {
    const c = antes ? cambio(e[p.id], antes[p.id]) : null;
    const ancho = Math.max(2, Math.round((e[p.id] / max) * 100));
    return `<tr><td style="padding:6px 0;font-size:14px;width:46%">${esc(p.label)}</td>`
      + `<td style="padding:6px 8px"><div style="background:#e8f1f9;border-radius:4px"><div style="background:#0a6fb8;height:10px;border-radius:4px;width:${ancho}%"></div></div></td>`
      + `<td style="padding:6px 0;text-align:right;font-weight:bold;font-size:16px;width:34px">${e[p.id]}</td>`
      + (c ? `<td style="padding:6px 0 6px 8px;text-align:right;font-size:12px;color:${c.color};width:34px">${c.txt}</td>` : "")
      + "</tr>";
  }).join("")}</table>`;
}

const titulo = (t: string) => `<h3 style="margin:22px 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#5b6472">${esc(t)}</h3>`;

export function correoReporte(d: DatosReporte): { asunto: string; html: string; texto: string } {
  const pila = d.nombre.split(" ")[0];
  const e = d.embudo, f = d.flotillas;
  const quien = d.equipo ? "la semana de la agencia" : "tu semana";
  const asunto = `${pila}, ${quien} (${d.rango}): ${plural(e.nuevos, "nuevo", "nuevos")} · ${plural(e.citas, "cita", "citas")} · ${plural(e.cierres, "cierre", "cierres")}`;
  const flotillasHtml = f.embudo.nuevos || f.embudo.contactados || f.embudo.propuestas || f.embudo.cierres
    ? `${titulo("Flotillas")}<p style="margin:0 0 8px;font-size:14px">${plural(f.embudo.nuevos, "prospecto nuevo", "prospectos nuevos")} de flotilla${f.unidades ? ` · <strong>${plural(f.unidades, "unidad potencial", "unidades potenciales")}</strong>` : ""}.</p>${tablaEmbudo(f.embudo, null)}`
    : `${titulo("Flotillas")}<p style="margin:0;font-size:14px;color:#5b6472">Sin movimiento de flotillas esta semana. Comparte la landing /flotillas con empresas, fraccionamientos y municipios.</p>`;
  const equipoHtml = d.equipo?.length
    ? `${titulo("Equipo")}<table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="color:#5b6472">${["Asesor", ...PASOS.map((p) => p.corto), "Mes"].map((t, i) => `<th style="text-align:${i ? "right" : "left"};padding:4px 2px;font-weight:normal">${t}</th>`).join("")}</tr>${d.equipo.map((r) => `<tr style="border-top:1px solid #e3e7ec"><td style="padding:6px 2px">${esc(r.nombre)}</td>${PASOS.map((p) => `<td style="padding:6px 2px;text-align:right">${r.embudo[p.id]}</td>`).join("")}<td style="padding:6px 2px;text-align:right;font-weight:bold">${r.unidadesMes}</td></tr>`).join("")}</table>`
    : "";
  const sinContactarHtml = d.sinContactar.length
    ? `${titulo("Sin contactar")}<ul style="margin:0;padding-left:18px;font-size:14px">${d.sinContactar.slice(0, 8).map((x) => `<li style="margin:3px 0">${esc(x.cliente)} <span style="color:#b42318">· ${plural(x.dias, "día", "días")}</span></li>`).join("")}</ul>${d.sinContactar.length > 8 ? `<p style="color:#5b6472;font-size:13px;margin:6px 0 0">Y ${d.sinContactar.length - 8} más en el CRM.</p>` : ""}`
    : "";
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#141820">
<div style="background:#0a6fb8;color:#fff;padding:18px 20px;border-radius:12px 12px 0 0"><div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.85">Reporte semanal · ${esc(d.rango)}</div><div style="font-size:22px;font-weight:bold;margin-top:4px">${esc(pila)}, así fue ${quien}</div></div>
<div style="border:1px solid #e3e7ec;border-top:0;padding:16px 20px;border-radius:0 0 12px 12px">
${titulo(d.equipo ? "Embudo de la agencia" : "Tu embudo")}${tablaEmbudo(e, d.anterior)}
<p style="margin:6px 0 0;font-size:12px;color:#5b6472">▲▼ contra la semana anterior.${e.perdidos ? ` ${plural(e.perdidos, "prospecto se marcó", "prospectos se marcaron")} como perdido.` : ""}</p>
${d.mes ? `${titulo(`Tu ${d.mes.nombre}`)}<p style="margin:0;font-size:15px">Unidades del mes: <strong>${esc(textoEscalon(d.mes.unidades))}</strong></p>` : ""}
${flotillasHtml}
${equipoHtml}
${sinContactarHtml}
<div style="margin:22px 0 4px;padding:12px 14px;background:#fff8e6;border-radius:8px;font-size:14px"><strong>Foco de esta semana:</strong> ${esc(d.foco)}</div>
<p style="margin:18px 0 4px"><a href="${esc(d.portal)}" style="background:#0a6fb8;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Abrir el CRM</a></p>
<p style="margin:14px 0 0;font-size:11px;color:#8a93a0">Contado con los cambios de etapa del CRM: si un prospecto no se mueve en el portal, no aparece aquí.</p>
</div></div>`;
  const texto = [
    `${pila}, así fue ${quien} (${d.rango})\n`,
    ...PASOS.map((p) => `${p.label}: ${e[p.id]} (${cambio(e[p.id], d.anterior[p.id]).txt})`),
    d.mes ? `\nUnidades del mes: ${textoEscalon(d.mes.unidades)}` : null,
    `\nFlotillas: ${plural(f.embudo.nuevos, "nuevo", "nuevos")}, ${plural(f.embudo.propuestas, "propuesta", "propuestas")}, ${plural(f.embudo.cierres, "cierre", "cierres")}${f.unidades ? `, ${plural(f.unidades, "unidad potencial", "unidades potenciales")}` : ""}`,
    ...(d.equipo ?? []).map((r) => `· ${r.nombre}: ${PASOS.map((p) => `${r.embudo[p.id]} ${p.corto.toLowerCase()}`).join(", ")} · ${r.unidadesMes} en el mes`),
    d.sinContactar.length ? `\nSin contactar: ${d.sinContactar.slice(0, 8).map((x) => x.cliente).join(", ")}` : null,
    `\nFoco de esta semana: ${d.foco}\n`, d.portal,
  ].filter((x) => x !== null).join("\n");
  return { asunto, html, texto };
}

/** Variables {{1}}…{{9}} de la plantilla de WhatsApp del reporte (ver README). Sin saltos de línea: WhatsApp los rechaza. */
export function variablesWhatsappReporte(d: DatosReporte): string[] {
  const e = d.embudo;
  const limpio = (t: string) => t.replace(/\s+/g, " ").trim();
  return [
    limpio(d.nombre.split(" ")[0]), d.rango,
    String(e.nuevos), String(e.contactados), String(e.citas), String(e.propuestas), String(e.cierres),
    d.mes ? textoEscalon(d.mes.unidades) : `${(d.equipo ?? []).reduce((t, r) => t + r.unidadesMes, 0)} en la agencia`,
    limpio(d.foco),
  ];
}
