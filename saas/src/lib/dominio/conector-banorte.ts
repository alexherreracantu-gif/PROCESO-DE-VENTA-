/**
 * Protocolo con la extensión de Chrome "Conector Banorte" (carpeta conector-banorte/).
 *
 * Ida: el portal abre el simulador oficial con la cotización en el fragmento de la URL
 *   https://automotriz.creditobanorte.com/banorte/cotizadorAbierto/BYD?tipoDeProducto=3#bydquote=<JSON en Base64URL>
 * (el fragmento no viaja al servidor del banco). La extensión lo lee, llena el simulador y calcula.
 *
 * Regreso: la extensión manda `postMessage({ source: "BYD-GRUPO-TEC", requestId, state, … })` a la
 * ventana que la abrió. Se acepta solo si viene del origen de Banorte, de esa misma ventana y con el
 * mismo requestId.
 */

export const URL_BANORTE = "https://automotriz.creditobanorte.com/banorte/cotizadorAbierto/BYD?tipoDeProducto=3";
export const ORIGEN_BANORTE = "https://automotriz.creditobanorte.com";
export const VERSION_CONECTOR = "0.5.0";

/** Nombres del catálogo de Banorte por código de modelo (respaldo si Banorte cambia los códigos). */
const NOMBRES_BANORTE: Record<string, [submarca: string, modelo: string]> = {
  BY2603A123576: ["DOLPHIN MINI", "DOLPHIN MINI 300KM EV AUT"],
  BY2603A123577: ["DOLPHIN MINI", "DOLPHIN MINI PLUS 380KM EV AUT"],
  BY2607A124660: ["SEAL", "SEAL BASE EV RWD AUT"],
  BY2607A124661: ["SEAL", "SEAL BASE EV AWD AUT"],
  BY2614A123783: ["SEALION 7", "SEALION 7 EV AWD"],
  BY2709A125999: ["KING", "KING GL DM-i PHEV"],
  BY2709A126000: ["KING", "KING GS DM-i PHEV"],
  BY2713A125715: ["YUAN PRO", "YUAN PRO DM-i"],
  BY2612A125074: ["SONG PRO", "SONG PRO DM-i"],
  BY2608A123723: ["SONG PLUS", "SONG PLUS DM-I MG6 HEV AUT"],
  BY2610C125192: ["SHARK PICK UP", "SHARK GL"],
  BY2610C125193: ["SHARK PICK UP", "SHARK GS"],
  BY2615A124013: ["M9", "M9"],
  BY2616A124945: ["ATTO 8", "ATTO 8"],
};

export type DatosBanorte = {
  requestId: string;
  origen: string;
  modelo: { nombre: string; anio: number; precio: number; submarca: string | null; anioBanorte: string | null; codigo: string | null };
  accesorios: number;
  descripcionAccesorios: string;
  garantia: number;
  /** Enganche total, bono incluido. */
  enganche: number;
  plazo: number;
  cp: string;
  edad: number;
  genero: "Masculino" | "Femenino";
  convenio: string;
  esperado: { monto: number; comision: number; mensualidad: number; tasa: number };
};

/** El cotizador del portal dice "Sin convenio"; en Banorte la opción se llama "Ninguno". */
export function convenioParaBanorte(nombre: string): string {
  return /^sin convenio$/i.test(nombre.trim()) ? "Ninguno" : nombre;
}

/** Campos exactos que espera banorte.js (mismos nombres que el cotizador anterior de Grupo TEC). */
export function payloadBanorte(d: DatosBanorte) {
  const nombres = d.modelo.codigo ? NOMBRES_BANORTE[d.modelo.codigo] : undefined;
  return {
    requestId: d.requestId,
    returnOrigin: d.origen,
    model: d.modelo.nombre,
    year: d.modelo.anio,
    ...(nombres ? { subbrand: nombres[0], bankModel: nombres[1] } : {}),
    subbrandCode: d.modelo.submarca,
    yearCode: d.modelo.anioBanorte,
    bankModelCode: d.modelo.codigo,
    price: d.modelo.precio,
    accessories: d.accesorios,
    accessoriesDesc: d.descripcionAccesorios,
    warranty: d.garantia,
    down: d.enganche,
    term: d.plazo,
    plazo: d.plazo,
    zip: d.cp,
    age: d.edad,
    gender: d.genero,
    convenio: convenioParaBanorte(d.convenio),
    expected: {
      principal: d.esperado.monto,
      fee: d.esperado.comision,
      monthly: d.esperado.mensualidad,
      rate: Math.round(d.esperado.tasa * 10000) / 100,
    },
  };
}

/** JSON → UTF-8 → Base64URL sin relleno (lo que decodifica banorte.js). */
export function base64url(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function urlBanorte(d: DatosBanorte): string {
  return `${URL_BANORTE}#bydquote=${base64url(JSON.stringify(payloadBanorte(d)))}`;
}

/** Lo que falta para poder mandar la cotización a Banorte (vacío = lista). */
export function faltantesBanorte(d: { codigo: string | null; cp: string; edad: string; genero: string }): string[] {
  const f: string[] = [];
  if (!d.codigo) f.push("código de Banorte del modelo");
  if (!/^\d{5}$/.test(d.cp)) f.push("código postal");
  const e = Number(d.edad);
  if (!Number.isInteger(e) || e < 18 || e > 74) f.push("edad (18 a 74)");
  if (d.genero !== "Masculino" && d.genero !== "Femenino") f.push("género");
  return f;
}

export type FilaBanorte = { plazo: number; rate: number; monthly: number };
export type RespuestaBanorte = {
  estado: "working" | "verified" | "review" | "error";
  mensaje: string;
  mensualidad: number | null;
  monto: number | null;
  comision: number | null;
  seguroAuto: number | null;
  seguroVida: number | null;
  filas: FilaBanorte[];
  /** Banorte subió el enganche a su mínimo (10%): los importes no corresponden a lo que se pidió. */
  ajusteMinimo: boolean;
  conector: string | null;
};

const numero = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * Valida un mensaje de la extensión. Devuelve null si no es para esta cotización
 * (otro origen, otra ventana, otro requestId o formato desconocido).
 */
export function leerRespuestaBanorte(
  e: { origin: string; source: unknown; data: unknown },
  esperado: { ventana: unknown; requestId: string },
): RespuestaBanorte | null {
  if (e.origin !== ORIGEN_BANORTE || !esperado.ventana || e.source !== esperado.ventana || !esperado.requestId) return null;
  const d = e.data as Record<string, unknown> | null;
  if (!d || typeof d !== "object" || d.source !== "BYD-GRUPO-TEC" || d.requestId !== esperado.requestId) return null;
  const estado = d.state;
  if (estado !== "working" && estado !== "verified" && estado !== "review" && estado !== "error") return null;
  const oficial = (d.official && typeof d.official === "object" ? d.official : {}) as Record<string, unknown>;
  const filas = (Array.isArray(oficial.rows) ? oficial.rows : [])
    .map((r: Record<string, unknown>) => ({ plazo: numero(r?.plazo), rate: numero(r?.rate), monthly: numero(r?.monthly) }))
    .filter((r): r is FilaBanorte => r.plazo != null && r.rate != null && r.monthly != null);
  return {
    estado,
    mensaje: typeof d.message === "string" ? d.message : "",
    mensualidad: numero(d.monthly),
    monto: numero(d.principal) ?? numero(oficial.principal),
    comision: numero(d.fee) ?? numero(oficial.fee),
    seguroAuto: numero(d.insurance) ?? numero(oficial.insurance),
    seguroVida: numero(d.life) ?? numero(oficial.life),
    filas,
    ajusteMinimo: d.belowBanorteMin === true,
    conector: typeof d.connectorVersion === "string" ? d.connectorVersion : null,
  };
}
