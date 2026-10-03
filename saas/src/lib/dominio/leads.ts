/** Normaliza un prospecto que llega de la landing, Meta (vía Make) u otro formulario. */
export type LeadEntrante = { nombre: string; telefono: string; modelo: string | null; origen: string; notas: string; calor: "alta" | "media" };

const primero = (d: Record<string, string>, claves: string[]) => {
  for (const k of claves) { const v = d[k]?.trim(); if (v) return v; }
  return "";
};

export function normalizarLead(d: Record<string, string>): LeadEntrante | { error: string } {
  const nombre = primero(d, ["nombre", "name", "full_name", "nombre_completo", "first_name"]).slice(0, 120);
  let telefono = primero(d, ["telefono", "phone", "phone_number", "whatsapp", "celular", "tel"]).replace(/\D/g, "");
  if (telefono.length === 12 && telefono.startsWith("52")) telefono = telefono.slice(2);
  if (telefono.length === 13 && telefono.startsWith("521")) telefono = telefono.slice(3);
  if (!nombre) return { error: "Falta el nombre." };
  if (telefono.length < 10) return { error: "Falta un teléfono de 10 dígitos." };
  const fuente = primero(d, ["origen", "source", "utm_source", "platform"]).toLowerCase();
  const origen = /facebook|instagram|meta|fb|ig/.test(fuente) ? "Meta Ads" : fuente.includes("whatsapp") ? "WhatsApp" : fuente ? fuente.slice(0, 40) : "Landing";
  const detalles = [
    ["Pago", primero(d, ["pago", "forma_pago"])], ["Enganche", primero(d, ["enganche", "down_payment"])], ["¿Cuándo?", primero(d, ["cuando", "timeline"])],
    ["Municipio", primero(d, ["municipio", "city", "ciudad"])], ["Mensaje", primero(d, ["mensaje", "message", "comentarios"])], ["Campaña", primero(d, ["utm_campaign", "campaign_name", "campaña"])],
    ["Anuncio", primero(d, ["utm_content", "ad_name"])],
  ].filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
  const prioridad = Number(primero(d, ["prioridad", "score"]));
  const cuando = primero(d, ["cuando", "timeline"]).toLowerCase();
  const calor = prioridad >= 70 || /hoy|semana|ya|inmediat/.test(cuando) ? "alta" : "media";
  return { nombre, telefono, modelo: primero(d, ["modelo", "model", "vehiculo", "auto"]) || null, origen, notas: detalles.join("\n").slice(0, 2000), calor };
}

/** El modelo del catálogo que mejor coincide con lo que escribió el cliente. */
export function buscarModelo<T extends { id: string; nombre: string }>(texto: string | null, modelos: T[]): T | null {
  if (!texto) return null;
  const t = texto.toLowerCase().replace(/byd\s*/g, "").trim();
  return modelos.find((m) => m.nombre.toLowerCase() === t) ?? modelos.find((m) => t.includes(m.nombre.toLowerCase()) || m.nombre.toLowerCase().includes(t)) ??
    modelos.find((m) => m.nombre.toLowerCase().split(" ")[0] === t.split(" ")[0]) ?? null;
}

/** Reparto por turno: al asesor con menos prospectos recibidos hoy (empate: el que menos ha recibido en total). */
export function elegirAsesor(asesores: { id: string; hoy: number; total: number }[]): string | null {
  if (!asesores.length) return null;
  return [...asesores].sort((a, b) => a.hoy - b.hoy || a.total - b.total || a.id.localeCompare(b.id))[0].id;
}

/** Campo trampa lleno o formulario enviado en menos de 3 segundos (si la landing manda el tiempo). */
export function esRobot(d: Record<string, string>): boolean {
  if ((d.sitio_web ?? d.website ?? "").trim()) return true;
  const t = d.t?.trim();
  return !!t && /^\d+$/.test(t) && Number(t) < 3;
}
