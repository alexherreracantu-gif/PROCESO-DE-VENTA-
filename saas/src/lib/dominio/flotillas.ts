/**
 * Ahorro estimado de una flotilla BYD contra vehículos de gasolina, para la landing de flotillas.
 * Mismas fórmulas que propuestas/Calculadora-Ahorro-Flotilla.xlsx. Los supuestos por omisión son de
 * ejemplo (se muestran en la landing) y el asesor los confirma con los datos reales del cliente.
 */
export const TIPOS_FLOTILLA = ["Empresa", "Fraccionamiento", "Municipio", "Desarrolladora"] as const;
export type TipoFlotilla = (typeof TIPOS_FLOTILLA)[number];

export type SupuestosFlotilla = {
  dias: number;           // días de uso al mes
  rendimiento: number;    // km por litro del vehículo actual
  precioGas: number;      // $ por litro
  mantActual: number;     // $ por unidad al mes
  kwh100Ev: number;       // consumo del eléctrico, kWh por 100 km
  precioKwh: number;      // $ por kWh
  mantEv: number;
  pctEv: number;          // parte de los km del híbrido en modo eléctrico (0 a 1)
  kwh100Hev: number;      // consumo eléctrico del híbrido, kWh por 100 km
  rendHev: number;        // km por litro del híbrido en modo gasolina
  mantHev: number;
};

export const SUPUESTOS: SupuestosFlotilla = {
  dias: 24, rendimiento: 12, precioGas: 24, mantActual: 1500,
  kwh100Ev: 12, precioKwh: 3, mantEv: 500,
  pctEv: 0.6, kwh100Hev: 15, rendHev: 22, mantHev: 900,
};

export type AhorroFlotilla = {
  kmMes: number;
  gasolinaMes: number;
  electrico: { energiaMes: number; ahorroUnidadMes: number; ahorroAnual: number };
  hibrido: { energiaMes: number; ahorroUnidadMes: number; ahorroAnual: number };
};

const limpio = (n: number, min = 0, max = Number.MAX_SAFE_INTEGER) => (Number.isFinite(n) ? Math.min(Math.max(n, min), max) : min);

export function ahorroFlotilla(unidades: number, kmDia: number, s: Partial<SupuestosFlotilla> = {}): AhorroFlotilla {
  const p = { ...SUPUESTOS, ...s };
  const u = limpio(Math.round(unidades), 0, 10_000);
  const kmMes = limpio(kmDia, 0, 2_000) * limpio(p.dias, 0, 31);
  const gasolinaMes = p.rendimiento > 0 ? (kmMes / p.rendimiento) * p.precioGas : 0;
  const energiaEv = (kmMes * p.kwh100Ev / 100) * p.precioKwh;
  const pct = limpio(p.pctEv, 0, 1);
  const energiaHev = (kmMes * pct * p.kwh100Hev / 100) * p.precioKwh + (p.rendHev > 0 ? (kmMes * (1 - pct) / p.rendHev) * p.precioGas : 0);
  const ev = gasolinaMes - energiaEv + (p.mantActual - p.mantEv);
  const hev = gasolinaMes - energiaHev + (p.mantActual - p.mantHev);
  return {
    kmMes, gasolinaMes,
    electrico: { energiaMes: energiaEv, ahorroUnidadMes: ev, ahorroAnual: ev * 12 * u },
    hibrido: { energiaMes: energiaHev, ahorroUnidadMes: hev, ahorroAnual: hev * 12 * u },
  };
}

/** Modelos que recomienda la landing para cada tipo de cliente (claves del catálogo). */
export const MODELOS_POR_TIPO: Record<TipoFlotilla, { clave: string; uso: string }[]> = {
  Empresa: [
    { clave: "dolphin-mini-300", uso: "Reparto y trámites en ciudad" },
    { clave: "king-gl", uso: "Fuerza de ventas" },
    { clave: "song-pro", uso: "Supervisores y gerentes" },
    { clave: "shark-gl", uso: "Campo y obra" },
  ],
  Fraccionamiento: [
    { clave: "dolphin-mini-300", uso: "Rondines de vigilancia" },
    { clave: "shark-gl", uso: "Mantenimiento y áreas verdes" },
    { clave: "king-gl", uso: "Administración" },
  ],
  Municipio: [
    { clave: "dolphin-mini-300", uso: "Inspección, trámites y mensajería" },
    { clave: "king-gl", uso: "Funcionarios y supervisión" },
    { clave: "song-pro", uso: "Protección civil y coordinación" },
    { clave: "shark-gl", uso: "Servicios públicos y parques" },
  ],
  Desarrolladora: [
    { clave: "dolphin-mini-300", uso: "Promoción «compra tu casa y estrena BYD»" },
    { clave: "king-gl", uso: "Equipo de ventas" },
    { clave: "shark-gl", uso: "Obra" },
  ],
};

/** Notas del prospecto para el CRM y texto del WhatsApp que el cliente manda al asesor. */
export function resumenFlotilla(d: { nombre: string; organizacion: string; tipo: TipoFlotilla; unidades: number; kmDia: number; correo?: string | null }, a: AhorroFlotilla) {
  const mejor = Math.max(a.electrico.ahorroAnual, a.hibrido.ahorroAnual);
  const fmt = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(Math.max(0, n));
  const notas = [
    `Flotilla · ${d.tipo}: ${d.organizacion}`,
    `Unidades: ${d.unidades} · ${d.kmDia} km por día`,
    `Ahorro estimado al año (supuestos de la landing): eléctrico ${fmt(a.electrico.ahorroAnual)}, híbrido ${fmt(a.hibrido.ahorroAnual)}`,
    d.correo ? `Correo: ${d.correo}` : null,
  ].filter(Boolean).join("\n");
  const whatsapp = [
    `Hola, soy ${d.nombre.trim().split(/\s+/)[0] || "cliente"} de ${d.organizacion}.`,
    `Me interesa una flotilla BYD de ${d.unidades} unidades (${d.tipo.toLowerCase()}), con unos ${d.kmDia} km por día.`,
    `La landing me estimó un ahorro de hasta ${fmt(mejor)} al año. ¿Me mandan la propuesta?`,
  ].join("\n");
  return { notas, whatsapp, mejor };
}
