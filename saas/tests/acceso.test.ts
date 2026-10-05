import { describe, expect, it } from "vitest";
import { decidirAcceso } from "@/lib/dominio/acceso";

describe("decidirAcceso", () => {
  it("deja pasar el webhook de prospectos sin sesión (lo protege LEADS_TOKEN)", () => {
    expect(decidirAcceso("/api/leads", false)).toBe("pasar");
  });

  it("el cotizador para clientes es público, la cotización interna no", () => {
    expect(decidirAcceso("/cotiza", false)).toBe("pasar");
    expect(decidirAcceso("/cotizacion", false)).toBe("al-login");
    expect(decidirAcceso("/cotizador", false)).toBe("al-login");
  });

  it("deja pasar el resumen diario de Vercel Cron (lo protege CRON_SECRET)", () => {
    expect(decidirAcceso("/api/cron/resumen", false)).toBe("pasar");
  });

  it("rechaza con 401 las demás API sin sesión", () => {
    expect(decidirAcceso("/api/agente", false)).toBe("no-autorizado");
    expect(decidirAcceso("/api/leadsx", false)).toBe("no-autorizado");
    expect(decidirAcceso("/api/respaldo", false)).toBe("no-autorizado");
    expect(decidirAcceso("/api/expedientes/x", false)).toBe("no-autorizado");
  });

  it("manda al login las páginas privadas sin sesión", () => {
    expect(decidirAcceso("/", false)).toBe("al-login");
    expect(decidirAcceso("/crm", false)).toBe("al-login");
  });

  it("abre las páginas públicas sin sesión", () => {
    for (const ruta of ["/login", "/configurar", "/salir", "/instalar", "/panel"]) expect(decidirAcceso(ruta, false)).toBe("pasar");
  });

  it("el dashboard general no abre otras rutas que empiecen igual", () => {
    expect(decidirAcceso("/panelx", false)).toBe("al-login");
  });

  it("con sesión, /login lleva al inicio y lo demás pasa", () => {
    expect(decidirAcceso("/login", true)).toBe("al-inicio");
    expect(decidirAcceso("/crm", true)).toBe("pasar");
    expect(decidirAcceso("/api/agente", true)).toBe("pasar");
  });
});
