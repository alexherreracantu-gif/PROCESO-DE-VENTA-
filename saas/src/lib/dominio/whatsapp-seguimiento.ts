/**
 * Seguimiento automático por WhatsApp de los prospectos de flotilla: qué plantilla toca cada día,
 * cuándo se detiene, cómo se reconoce una BAJA y cómo se lee lo que manda el webhook de Meta.
 * Todo puro (sin red ni base) para poder probarlo.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Etapa } from "./catalogos";

export const PASOS_SEGUIMIENTO = [
  { id: "dia1", dia: 1 },
  { id: "dia3", dia: 3 },
  { id: "dia7", dia: 7 },
  { id: "dia14", dia: 14 },
] as const;
export type PasoSeguimiento = (typeof PASOS_SEGUIMIENTO)[number]["id"];
export type PasoMensaje = PasoSeguimiento | "bienvenida";

/** Solo se sigue escribiendo mientras el prospecto no avanza a cita (de ahí en adelante lo lleva el asesor). */
export const ETAPAS_CON_SEGUIMIENTO: Etapa[] = ["nuevo", "contactado"];

/** Un paso que se atrasó (cron caído, domingo) se manda hasta 2 días tarde; después se salta. */
const TOLERANCIA_DIAS = 2;

/** "flotilla_dia1,flotilla_dia3,flotilla_dia7,flotilla_dia14" → nombre por paso. Si no son 4, el seguimiento está apagado. */
export function plantillasSeguimiento(valor: string | undefined | null): Record<PasoSeguimiento, string> | null {
  const nombres = (valor ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  if (nombres.length !== PASOS_SEGUIMIENTO.length || nombres.some((n) => !/^[a-z0-9_]{1,512}$/.test(n))) return null;
  return Object.fromEntries(PASOS_SEGUIMIENTO.map((p, i) => [p.id, nombres[i]])) as Record<PasoSeguimiento, string>;
}

/** Los 10 dígitos de un número de México (WhatsApp manda "52…" o "521…"). */
export function diezDigitos(tel: string | null | undefined): string | null {
  const t = String(tel ?? "").replace(/\D/g, "");
  return t.length >= 10 ? t.slice(-10) : null;
}

/** Días completos entre dos fechas "AAAA-MM-DD". */
export function diasEntre(desde: string, hasta: string) {
  return Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86_400_000);
}

export type Seguimiento = {
  creado: string;              // fecha (Monterrey) en que entró el prospecto
  hoy: string;
  etapa: Etapa;
  consentimiento: boolean;     // marcó la casilla de WhatsApp en la landing
  baja: boolean;
  respondio: boolean;          // contestó algo después de entrar
  enviados: { paso: PasoMensaje; estado: string }[];
};
export type Decision =
  | { accion: "enviar"; paso: PasoSeguimiento }
  | { accion: "nada"; motivo: "sin-consentimiento" | "baja" | "respondio" | "etapa" | "fallo" | "aun-no" | "ya-enviado" | "terminado" };

export function decidirSeguimiento(s: Seguimiento): Decision {
  if (!s.consentimiento) return { accion: "nada", motivo: "sin-consentimiento" };
  if (s.baja) return { accion: "nada", motivo: "baja" };
  if (s.respondio) return { accion: "nada", motivo: "respondio" };
  if (!ETAPAS_CON_SEGUIMIENTO.includes(s.etapa)) return { accion: "nada", motivo: "etapa" };
  if (s.enviados.some((e) => e.estado === "fallido")) return { accion: "nada", motivo: "fallo" };
  const dias = diasEntre(s.creado, s.hoy);
  const toca = PASOS_SEGUIMIENTO.filter((p) => p.dia <= dias).at(-1);
  if (!toca) return { accion: "nada", motivo: "aun-no" };
  const ultimo = toca.id === PASOS_SEGUIMIENTO.at(-1)!.id;
  if (s.enviados.some((e) => e.paso === toca.id)) return { accion: "nada", motivo: ultimo ? "terminado" : "ya-enviado" };
  if (dias > toca.dia + TOLERANCIA_DIAS) return { accion: "nada", motivo: ultimo ? "terminado" : "aun-no" };
  return { accion: "enviar", paso: toca.id };
}

const sinAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** "BAJA", "baja por favor", "STOP", "Detener promociones"… Mensajes cortos que empiezan con la palabra. */
export function esBaja(texto: string | null | undefined): boolean {
  const t = sinAcentos(String(texto ?? "")).toUpperCase().replace(/[^A-Z ]/g, " ").replace(/\s+/g, " ").trim();
  if (!t || t.split(" ").length > 5) return false;
  return /^(BAJA|DAR DE BAJA|DARME DE BAJA|STOP|ALTO|DETENER|CANCELAR|UNSUBSCRIBE|NO MAS MENSAJES|YA NO ME ESCRIBAN)( |$)/.test(t);
}

/** Texto de un mensaje para el CRM: una línea, sin espacios de más, recortado. */
export function textoCorto(t: string, max = 300) {
  const limpio = t.replace(/\s+/g, " ").trim();
  return limpio.length > max ? `${limpio.slice(0, max - 1)}…` : limpio;
}

/** Firma X-Hub-Signature-256 de Meta: HMAC-SHA256 del cuerpo crudo con el App Secret. */
export function firmaValida(cuerpo: string, encabezado: string | null, secreto: string | undefined): boolean {
  if (!secreto || !encabezado?.startsWith("sha256=")) return false;
  const esperado = Buffer.from(`sha256=${createHmac("sha256", secreto).update(cuerpo, "utf8").digest("hex")}`);
  const recibido = Buffer.from(encabezado);
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}

export type MensajeEntrante = { waId: string; telefono: string; texto: string; baja: boolean };
export type EstadoEntrega = { waId: string; estado: "enviado" | "entregado" | "leido" | "fallido"; error: string | null };

const ESTADOS: Record<string, EstadoEntrega["estado"]> = { sent: "enviado", delivered: "entregado", read: "leido", failed: "fallido" };
/** Orden de los estados: uno que llega tarde ("entregado" después de "leído") no regresa el estado. */
export const RANGO_ESTADO: Record<string, number> = { enviando: 0, enviado: 1, entregado: 2, leido: 3, fallido: 4 };

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * Mensajes y estados de entrega de un aviso del webhook, solo del número propio (`phoneId`).
 * Lo que no se entiende se ignora.
 */
export function leerWebhook(cuerpo: unknown, phoneId: string | undefined): { mensajes: MensajeEntrante[]; estados: EstadoEntrega[] } {
  const mensajes: MensajeEntrante[] = [], estados: EstadoEntrega[] = [];
  for (const entrada of lista(obj(cuerpo).entry)) {
    for (const cambio of lista(obj(entrada).changes)) {
      const c = obj(cambio);
      if (c.field !== "messages") continue;
      const v = obj(c.value);
      if (phoneId && str(obj(v.metadata).phone_number_id) !== phoneId) continue;
      for (const m of lista(v.messages).map(obj)) {
        const telefono = diezDigitos(str(m.from)), waId = str(m.id);
        if (!telefono || !waId) continue;
        const boton = obj(m.button), interactivo = obj(obj(m.interactive).button_reply);
        const texto = str(obj(m.text).body) || str(boton.text) || str(boton.payload) || str(interactivo.title) || str(interactivo.id) || `[${str(m.type) || "mensaje"}]`;
        mensajes.push({ waId, telefono, texto, baja: esBaja(texto) || esBaja(str(boton.payload)) });
      }
      for (const e of lista(v.statuses).map(obj)) {
        const estado = ESTADOS[str(e.status)], waId = str(e.id);
        if (!estado || !waId) continue;
        const err = obj(lista(e.errors)[0]);
        estados.push({ waId, estado, error: estado === "fallido" ? `${err.code ?? ""} ${str(err.title) || str(err.message)}`.trim() || "Falló la entrega" : null });
      }
    }
  }
  return { mensajes, estados };
}
