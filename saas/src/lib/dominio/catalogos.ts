/** Listas fijas del negocio. Lo que cambia por mes (modelos, precios, productos) vive en la base. */

export type Rol = "ceo" | "gerente" | "asesor";
export const ROLES: Record<Rol, string> = { ceo: "CEO", gerente: "Gerente", asesor: "Asesor" };
export const esDireccion = (rol: Rol | null | undefined) => rol === "ceo" || rol === "gerente";

export const COLORES = [
  { id: "Blanco", hex: "#f4f4f2" },
  { id: "Negro", hex: "#141518" },
  { id: "Gris", hex: "#6b7078" },
  { id: "Plata", hex: "#c3c7cc" },
  { id: "Azul", hex: "#2f5a9e" },
  { id: "Verde", hex: "#4f7a5a" },
  { id: "Rojo", hex: "#a8322d" },
  { id: "Arena", hex: "#c9b48f" },
  { id: "Rosa", hex: "#d9a3b0" },
  { id: "Morado", hex: "#6a4f8a" },
  { id: "Otro", hex: "#9aa0a8" },
] as const;
export const colorHex = (c: string | null | undefined) => COLORES.find((x) => x.id === c)?.hex ?? "#9aa0a8";

export const FORMAS_PAGO = ["Crédito Banorte", "Crédito otro banco", "Contado"] as const;
export const PLAZAS = ["Monterrey", "Piedras Negras"] as const;

export type EstatusVenta = "apartada" | "facturada" | "entregada" | "cancelada";
export const ESTATUS: { id: EstatusVenta; label: string; tono: "warn" | "acc" | "ok" | "bad" }[] = [
  { id: "apartada", label: "Apartada", tono: "warn" },
  { id: "facturada", label: "Facturada", tono: "acc" },
  { id: "entregada", label: "Entregada", tono: "ok" },
  { id: "cancelada", label: "Cancelada", tono: "bad" },
];
export const estatusInfo = (id: string) => ESTATUS.find((e) => e.id === id) ?? ESTATUS[1];

export type Etapa = "nuevo" | "contactado" | "cita" | "prueba" | "cotizado" | "credito" | "apartado" | "entregado" | "referidor" | "perdido";
export const ETAPAS: { id: Etapa; label: string }[] = [
  { id: "nuevo", label: "Nuevo" },
  { id: "contactado", label: "Contactado" },
  { id: "cita", label: "Cita" },
  { id: "prueba", label: "Prueba de manejo" },
  { id: "cotizado", label: "Cotizado" },
  { id: "credito", label: "Crédito" },
  { id: "apartado", label: "Apartado" },
  { id: "entregado", label: "Entregado" },
  { id: "referidor", label: "Referidor" },
  { id: "perdido", label: "Perdido" },
];
export const ETAPAS_CERRADAS: Etapa[] = ["entregado", "referidor", "perdido"];
export const ORIGENES = ["Park Point", "QR Park Point", "Meta Ads", "Instagram", "WhatsApp", "Referido", "Flotilla", "Lead viejo", "Otro"];
export type Calor = "alta" | "media" | "fria";
export const CALORES: { id: Calor; label: string }[] = [
  { id: "alta", label: "Caliente" },
  { id: "media", label: "Tibio" },
  { id: "fria", label: "Frío" },
];

export const CORTE = [
  { id: "nuevos", label: "Clientes nuevos" },
  { id: "citas", label: "Citas" },
  { id: "regresos", label: "Regresos" },
  { id: "prospeccion", label: "Cliente prospección" },
  { id: "domicilio", label: "Visita a domicilio" },
  { id: "facebook", label: "Facebook asesor" },
  { id: "demos", label: "Demos" },
  { id: "solicitudes", label: "Solicitudes" },
  { id: "facturas", label: "Facturas" },
  { id: "separaciones", label: "Separaciones" },
  { id: "entregas", label: "Entregas" },
  { id: "firmas", label: "Firmas" },
] as const;
export type ClaveCorte = (typeof CORTE)[number]["id"];

/** Los 11 pasos del expediente. `credito` = solo aplica si la venta es financiada. */
export const PASOS_EXPEDIENTE = [
  { id: "cliente", label: "Datos del cliente", ayuda: "Nombre completo, teléfono y plaza." },
  { id: "cotizacion", label: "Cotización enviada", ayuda: "Cotización + lista de documentos por WhatsApp." },
  { id: "documentos", label: "Documentos al banco", ayuda: "INE, comprobante de domicilio e ingresos.", credito: true },
  { id: "aprobacion", label: "Crédito aprobado", ayuda: "No pidas la separación antes de esto.", credito: true },
  { id: "separacion", label: "Separación de $5,000", ayuda: "Es parte del enganche. Gancho: el color interior." },
  { id: "quiter", label: "Alta en Quiter", ayuda: "Comercial → Fichas maestras → Cuentas personales." },
  { id: "caja", label: "Separación en caja", ayuda: "Siempre al concepto Accesorios con el código de cliente." },
  { id: "firma", label: "Enganche y firma", ayuda: "¿Qué le vendí? (extras) y ¿qué le di? (bonos)." },
  { id: "desembolso", label: "Desembolso del banco", ayuda: "Compara el desembolso real contra el esperado.", credito: true },
  { id: "cuadre", label: "Cuadre sin adeudo", ayuda: "Si falta aunque sea $1, el carro no sale." },
  { id: "entrega", label: "Entrega", ayuda: "Unos 4 días. Reseña, video y referidos." },
] as const;
export type PasoExpediente = (typeof PASOS_EXPEDIENTE)[number]["id"];

export function pasosAplicables(formaPago: string) {
  const contado = formaPago === "Contado";
  return PASOS_EXPEDIENTE.filter((p) => !(contado && "credito" in p && p.credito));
}
export function avanceExpediente(formaPago: string, expediente: Record<string, string | undefined> | null | undefined) {
  const pasos = pasosAplicables(formaPago);
  const hechos = pasos.filter((p) => expediente?.[p.id]).length;
  const siguiente = pasos.find((p) => !expediente?.[p.id]) ?? null;
  return { total: pasos.length, hechos, pct: pasos.length ? hechos / pasos.length : 0, siguiente };
}

export const GUIONES = [
  { t: "Bienvenida Park Point (30 s)", b: "Hola, soy {n} de BYD. ¿Qué te trae hoy? Si quieres, en 5 minutos te armo una mensualidad del modelo que más te convenga." },
  { t: "Diagnóstico", b: "¿Cuántos km haces al día? ¿Quién más lo maneja? ¿Cuánto se te va en gasolina al mes? ¿Traes auto a cuenta o arrancas de cero?" },
  { t: "King en 30 segundos", b: "¿Estás pensando en estrenar este mes? El King 2027 es híbrido enchufable: unos 50 km eléctricos, hasta 1,600 km combinados y alrededor de 27 km/l. Más potencia, menos gasto. ¿Lo pruebas ahora?" },
  { t: "Cotización corta", b: "Te lo dejo fácil: tú pones $50,000 y hay $25,000 de bono (financiando). Te armo la mensualidad a 72 meses con Banorte y te la mando aquí. Sujeto a autorización." },
  { t: "“Está caro”", b: "¿Caro contra qué? Si te parece, hacemos la cuenta con lo que gastas hoy en gasolina y ves la mensualidad neta." },
  { t: "“Lo voy a pensar”", b: "Perfecto. ¿Qué parte te falta pensar: el auto, la mensualidad o el enganche? Así te dejo números claros y agendamos la prueba." },
  { t: "Contado", b: "El bono aplica financiando desde 5% de enganche. A veces sale más barato financiar el mínimo que irte de contado. Te muestro los dos escenarios." },
  { t: "Toma a cuenta", b: "Sí tomamos autos a cuenta. ¿Me compartes marca, año, versión, km y si tiene saldo? Con fotos (frente, laterales, atrás, interiores y tablero) lo mando a evaluación." },
  { t: "Garantía extendida", b: "Para que manejes tranquilo los próximos años: la garantía extendida es de 6 años con kilometraje ilimitado. Se puede incluir en el financiamiento y queda dentro de tu mensualidad." },
  { t: "Seguro de llantas y Cerocible", b: "Dos cosas que casi todos mis clientes agregan: el seguro de llantas, por los baches de Monterrey, y Cerocible, que te cubre el 100% de factura. ¿Te los incluyo en la cotización?" },
  { t: "Seguimiento día 1", b: "Hola, te escribo para darte seguimiento a la cotización. Si quieres actualizo números con la promo del mes y vemos qué opción te conviene más." },
  { t: "Cierre", b: "¿Lo apartamos hoy con $5,000 para asegurar bono y color? Completas el resto del enganche en agencia." },
];

export const KPIS_LUNES = [
  ["Unidades vendidas", "3–4"], ["Contactos nuevos", "72–80"], ["Citas agendadas", "22–25"], ["Pruebas de manejo", "13"],
  ["Respuesta en WhatsApp", "< 5 min"], ["Asistencia a citas", "70%+"], ["Cierre sobre pruebas", "25–35%"],
  ["Referidos pedidos / recibidos", "10 / 2"], ["Venta cruzada", "1 de cada 2 ventas"],
] as const;
