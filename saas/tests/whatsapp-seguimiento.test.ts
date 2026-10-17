import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  decidirSeguimiento, diezDigitos, esBaja, firmaValida, leerWebhook, plantillasSeguimiento, textoCorto, type Seguimiento,
} from "@/lib/dominio/whatsapp-seguimiento";
import { decidirAcceso } from "@/lib/dominio/acceso";

const base: Seguimiento = { creado: "2026-10-01", hoy: "2026-10-01", etapa: "nuevo", consentimiento: true, baja: false, respondio: false, enviados: [{ paso: "bienvenida", estado: "entregado" }] };
const el = (hoy: string, extra: Partial<Seguimiento> = {}) => decidirSeguimiento({ ...base, hoy, ...extra });

describe("qué seguimiento toca", () => {
  it("manda el día 1, 3, 7 y 14 y nada entre medio", () => {
    expect(el("2026-10-01")).toEqual({ accion: "nada", motivo: "aun-no" });
    expect(el("2026-10-02")).toEqual({ accion: "enviar", paso: "dia1" });
    expect(el("2026-10-04")).toEqual({ accion: "enviar", paso: "dia3" });
    expect(el("2026-10-08")).toEqual({ accion: "enviar", paso: "dia7" });
    expect(el("2026-10-15")).toEqual({ accion: "enviar", paso: "dia14" });
  });

  it("nunca repite un paso y termina después del día 14", () => {
    expect(el("2026-10-03", { enviados: [{ paso: "dia1", estado: "leido" }] })).toEqual({ accion: "nada", motivo: "ya-enviado" });
    expect(el("2026-10-15", { enviados: [{ paso: "dia14", estado: "enviado" }] })).toEqual({ accion: "nada", motivo: "terminado" });
    expect(el("2026-10-20")).toEqual({ accion: "nada", motivo: "terminado" });
  });

  it("si un paso se atrasó (domingo, cron caído) lo manda hasta 2 días tarde; después espera el siguiente", () => {
    expect(el("2026-10-03")).toEqual({ accion: "enviar", paso: "dia1" });
    expect(el("2026-10-06")).toEqual({ accion: "enviar", paso: "dia3" });
    expect(el("2026-10-07")).toEqual({ accion: "nada", motivo: "aun-no" });
  });

  it("se detiene si contestó, pidió baja, avanzó de etapa, no dio permiso o falló un envío", () => {
    expect(el("2026-10-04", { respondio: true })).toEqual({ accion: "nada", motivo: "respondio" });
    expect(el("2026-10-04", { baja: true })).toEqual({ accion: "nada", motivo: "baja" });
    expect(el("2026-10-04", { etapa: "cita" })).toEqual({ accion: "nada", motivo: "etapa" });
    expect(el("2026-10-04", { etapa: "perdido" })).toEqual({ accion: "nada", motivo: "etapa" });
    expect(el("2026-10-04", { etapa: "contactado" })).toEqual({ accion: "enviar", paso: "dia3" });
    expect(el("2026-10-04", { consentimiento: false })).toEqual({ accion: "nada", motivo: "sin-consentimiento" });
    expect(el("2026-10-04", { enviados: [{ paso: "bienvenida", estado: "fallido" }] })).toEqual({ accion: "nada", motivo: "fallo" });
  });
});

describe("BAJA y teléfonos", () => {
  it("reconoce la baja en mensajes cortos, con o sin acentos", () => {
    for (const t of ["BAJA", "baja", "Baja por favor", "  baja. ", "STOP", "Alto", "Dar de baja", "No más mensajes", "Detener promociones"]) expect(esBaja(t)).toBe(true);
  });
  it("no confunde una respuesta normal con una baja", () => {
    for (const t of ["Sí me interesa", "¿Cuánto cuesta?", "Bajamos 3 unidades la otra semana", "Quiero dar de baja mis autos de gasolina y cambiar a BYD pronto", "", null]) expect(esBaja(t)).toBe(false);
  });
  it("deja los teléfonos en 10 dígitos", () => {
    expect(diezDigitos("5218112345678")).toBe("8112345678");
    expect(diezDigitos("528112345678")).toBe("8112345678");
    expect(diezDigitos("81 1234 5678")).toBe("8112345678");
    expect(diezDigitos("12345")).toBeNull();
  });
  it("recorta el texto para el CRM", () => {
    expect(textoCorto("hola\n\n  qué tal")).toBe("hola qué tal");
    expect(textoCorto("x".repeat(500), 10)).toHaveLength(10);
  });
});

describe("plantillas del seguimiento", () => {
  it("necesita las 4 plantillas con nombres válidos", () => {
    expect(plantillasSeguimiento("flotilla_dia1, flotilla_dia3,flotilla_dia7,flotilla_dia14")).toEqual({ dia1: "flotilla_dia1", dia3: "flotilla_dia3", dia7: "flotilla_dia7", dia14: "flotilla_dia14" });
    expect(plantillasSeguimiento("flotilla_dia1,flotilla_dia3")).toBeNull();
    expect(plantillasSeguimiento("a,b,c,D E")).toBeNull();
    expect(plantillasSeguimiento(undefined)).toBeNull();
  });
});

describe("webhook de Meta", () => {
  const secreto = "secreto-de-prueba";
  const firmar = (c: string) => `sha256=${createHmac("sha256", secreto).update(c).digest("hex")}`;

  it("solo acepta avisos firmados con el App Secret", () => {
    const c = JSON.stringify({ entry: [] });
    expect(firmaValida(c, firmar(c), secreto)).toBe(true);
    expect(firmaValida(c + " ", firmar(c), secreto)).toBe(false);
    expect(firmaValida(c, firmar(c), "otro")).toBe(false);
    expect(firmaValida(c, null, secreto)).toBe(false);
    expect(firmaValida(c, firmar(c), undefined)).toBe(false);
  });

  it("lee mensajes, botones y estados solo del número propio", () => {
    const cuerpo = {
      object: "whatsapp_business_account",
      entry: [{ changes: [
        { field: "messages", value: { metadata: { phone_number_id: "111" },
          messages: [
            { from: "5218112345678", id: "wamid.1", type: "text", text: { body: "Sí, ¿cuándo pueden venir?" } },
            { from: "5218187654321", id: "wamid.2", type: "button", button: { text: "Detener promociones", payload: "BAJA" } },
          ],
          statuses: [
            { id: "wamid.out1", status: "read" },
            { id: "wamid.out2", status: "failed", errors: [{ code: 131026, title: "Message undeliverable" }] },
            { id: "wamid.out3", status: "otro" },
          ] } },
        { field: "messages", value: { metadata: { phone_number_id: "999" }, messages: [{ from: "5218100000000", id: "wamid.x", text: { body: "BAJA" } }] } },
      ] }],
    };
    const r = leerWebhook(cuerpo, "111");
    expect(r.mensajes).toEqual([
      { waId: "wamid.1", telefono: "8112345678", texto: "Sí, ¿cuándo pueden venir?", baja: false },
      { waId: "wamid.2", telefono: "8187654321", texto: "Detener promociones", baja: true },
    ]);
    expect(r.estados).toEqual([
      { waId: "wamid.out1", estado: "leido", error: null },
      { waId: "wamid.out2", estado: "fallido", error: "131026 Message undeliverable" },
    ]);
    expect(leerWebhook("basura", "111")).toEqual({ mensajes: [], estados: [] });
  });

  it("la ruta del webhook se abre sin sesión (la protege la firma)", () => {
    expect(decidirAcceso("/api/whatsapp/webhook", false)).toBe("pasar");
    expect(decidirAcceso("/api/whatsapp/otra", false)).toBe("no-autorizado");
  });
});
