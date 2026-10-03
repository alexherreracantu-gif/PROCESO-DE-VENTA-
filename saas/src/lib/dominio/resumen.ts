/** Correo de cada mañana: lo urgente del día, armado como HTML sencillo que se ve bien en el celular. */

export type PuntoResumen = { cliente: string; texto: string; grave: boolean; enlace: string };
export type DatosResumen = { nombre: string; fecha: string; portal: string; puntos: PuntoResumen[]; entregasHoy: number; seguimientos: number };

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** null si no hay nada que avisar (no se manda correo vacío). */
export function correoResumen(d: DatosResumen): { asunto: string; html: string; texto: string } | null {
  if (!d.puntos.length && !d.entregasHoy && !d.seguimientos) return null;
  const graves = d.puntos.filter((p) => p.grave).length;
  const partes = [
    d.entregasHoy ? `${d.entregasHoy} ${d.entregasHoy === 1 ? "entrega" : "entregas"} hoy` : null,
    graves ? `${graves} ${graves === 1 ? "urgente" : "urgentes"}` : null,
    d.seguimientos ? `${d.seguimientos} ${d.seguimientos === 1 ? "seguimiento" : "seguimientos"}` : null,
  ].filter(Boolean);
  const asunto = `${d.nombre.split(" ")[0]}, tu día: ${partes.length ? partes.join(" · ") : `${d.puntos.length} ${d.puntos.length === 1 ? "pendiente" : "pendientes"}`}`;
  const filas = d.puntos.slice(0, 15).map((p) =>
    `<tr><td style="padding:10px 0;border-bottom:1px solid #e3e7ec"><a href="${esc(p.enlace)}" style="color:#141820;text-decoration:none"><strong>${esc(p.cliente)}</strong><br><span style="color:${p.grave ? "#b42318" : "#5b6472"};font-size:13px">${p.grave ? "● " : ""}${esc(p.texto)}</span></a></td></tr>`).join("");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#141820">
<div style="background:#0a6fb8;color:#fff;padding:18px 20px;border-radius:12px 12px 0 0"><div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.85">Park Point · ${esc(d.fecha)}</div><div style="font-size:22px;font-weight:bold;margin-top:4px">Buenos días, ${esc(d.nombre.split(" ")[0])}</div></div>
<div style="border:1px solid #e3e7ec;border-top:0;padding:16px 20px;border-radius:0 0 12px 12px">
${d.entregasHoy ? `<p style="margin:0 0 8px">🚗 <strong>${d.entregasHoy} ${d.entregasHoy === 1 ? "entrega" : "entregas"} hoy.</strong> Revisa que el expediente esté al 100%.</p>` : ""}
${d.seguimientos ? `<p style="margin:0 0 8px">📲 <strong>${d.seguimientos} ${d.seguimientos === 1 ? "prospecto espera" : "prospectos esperan"}</strong> tu seguimiento hoy.</p>` : ""}
${filas ? `<table style="width:100%;border-collapse:collapse;margin-top:6px">${filas}</table>` : ""}
${d.puntos.length > 15 ? `<p style="color:#5b6472;font-size:13px">Y ${d.puntos.length - 15} más en el portal.</p>` : ""}
<p style="margin:18px 0 4px"><a href="${esc(d.portal)}" style="background:#0a6fb8;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Abrir el portal</a></p>
</div></div>`;
  const texto = [`Buenos días, ${d.nombre.split(" ")[0]}`, partes.join(" · "), "", ...d.puntos.slice(0, 15).map((p) => `• ${p.cliente}: ${p.texto}`), "", d.portal].join("\n");
  return { asunto, html, texto };
}
