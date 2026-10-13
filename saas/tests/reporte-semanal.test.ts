import { describe, expect, it } from "vitest";
import {
  correoReporte, embudo, embudoVacio, focoSemana, semanaPasada, textoEscalon, textoRango, variablesWhatsappReporte,
  type DatosReporte, type EventoEtapa,
} from "@/lib/dominio/reporte-semanal";

const ev = (prospecto_id: string, de: EventoEtapa["de"], a: EventoEtapa["a"], fecha = "2026-10-14"): EventoEtapa => ({ prospecto_id, de, a, fecha });

describe("embudo de la semana", () => {
  it("cuenta cada prospecto una vez por paso, aunque se salte etapas", () => {
    const e = embudo([
      ev("p1", null, "nuevo"), ev("p1", "nuevo", "contactado"), ev("p1", "contactado", "cita"),
      ev("p2", null, "nuevo"), ev("p2", "nuevo", "cotizado"),
      ev("p3", "credito", "apartado"),
    ]);
    expect(e).toEqual({ nuevos: 2, contactados: 2, citas: 2, propuestas: 1, cierres: 1, perdidos: 0 });
  });

  it("no cuenta dos veces al que va y viene dentro de la misma etapa", () => {
    const e = embudo([ev("p1", "cita", "prueba"), ev("p1", "prueba", "cita"), ev("p1", "cita", "prueba")]);
    expect(e).toEqual(embudoVacio());
  });

  it("un perdido que vuelve cuenta otra vez; referidor y perdido no avanzan el embudo", () => {
    const e = embudo([ev("p1", "cotizado", "perdido"), ev("p1", "perdido", "cita"), ev("p2", "entregado", "referidor")]);
    expect(e).toMatchObject({ nuevos: 0, contactados: 1, citas: 1, propuestas: 0, cierres: 0, perdidos: 1 });
  });

  it("un prospecto que entra directo en cita cuenta como nuevo, contactado y cita", () => {
    expect(embudo([ev("p1", null, "cita")])).toMatchObject({ nuevos: 1, contactados: 1, citas: 1, propuestas: 0 });
  });
});

describe("semana del reporte", () => {
  it("el lunes reporta de lunes a domingo de la semana pasada", () => {
    expect(semanaPasada("2026-10-19")).toEqual({ desde: "2026-10-12", hasta: "2026-10-18", previaDesde: "2026-10-05", previaHasta: "2026-10-11" });
  });
  it("cualquier otro día también reporta la última semana completa", () => {
    expect(semanaPasada("2026-10-13").desde).toBe("2026-10-05");
    expect(semanaPasada("2026-10-18").desde).toBe("2026-10-05");
    expect(semanaPasada("2026-11-02")).toMatchObject({ desde: "2026-10-26", hasta: "2026-11-01" });
  });
  it("arma el texto del rango", () => {
    expect(textoRango("2026-10-12", "2026-10-18")).toBe("12 al 18 de octubre");
    expect(textoRango("2026-09-28", "2026-10-04")).toBe("28 de septiembre al 4 de octubre");
  });
});

describe("escalones y foco", () => {
  it("dice cuánto falta para el siguiente escalón", () => {
    expect(textoEscalon(0)).toBe("0 (te faltan 7 para 7)");
    expect(textoEscalon(7)).toBe("7 (te faltan 6 para 13)");
    expect(textoEscalon(15)).toBe("15 (ya estás en el escalón de 13+)");
  });
  it("primero los prospectos sin contactar; luego donde se atora el embudo", () => {
    const e = { ...embudoVacio(), nuevos: 10, contactados: 9, citas: 1 };
    expect(focoSemana(e, 3)).toMatch(/3 prospectos sin contactar/);
    expect(focoSemana(e, 0)).toMatch(/cita/);
    expect(focoSemana(embudoVacio(), 0)).toMatch(/No entraron prospectos/);
    expect(focoSemana({ ...embudoVacio(), nuevos: 4, contactados: 4, citas: 3, propuestas: 3 }, 0)).toMatch(/Llama/);
  });
});

describe("correo y WhatsApp del reporte", () => {
  const base: DatosReporte = {
    nombre: "Alex Herrera", rango: "12 al 18 de octubre", portal: "https://portal.test/crm",
    embudo: { nuevos: 5, contactados: 4, citas: 2, propuestas: 1, cierres: 1, perdidos: 1 },
    anterior: { nuevos: 3, contactados: 4, citas: 3, propuestas: 1, cierres: 0, perdidos: 0 },
    flotillas: { embudo: { ...embudoVacio(), nuevos: 1 }, unidades: 12 },
    mes: { nombre: "octubre", unidades: 3 },
    sinContactar: [{ cliente: "Ana <script>", dias: 2 }],
    equipo: null,
    foco: "Llama a cada propuesta.",
  };

  it("el asunto resume la semana y el cuerpo escapa los nombres", () => {
    const c = correoReporte(base);
    expect(c.asunto).toBe("Alex, tu semana (12 al 18 de octubre): 5 nuevos · 2 citas · 1 cierre");
    expect(c.html).toContain("Ana &lt;script&gt;");
    expect(c.html).not.toContain("<script>");
    expect(c.html).toContain("▲2");
    expect(c.html).toContain("▼1");
    expect(c.html).toContain("12 unidades potenciales");
    expect(c.html).toContain("te faltan 4 para 7");
    expect(c.texto).toContain("Prospectos nuevos: 5 (▲2)");
  });

  it("dirección ve la tabla del equipo", () => {
    const c = correoReporte({ ...base, mes: null, equipo: [{ nombre: "Omar", embudo: base.embudo, unidadesMes: 6 }] });
    expect(c.html).toContain("Embudo de la agencia");
    expect(c.html).toContain("Omar");
    expect(c.texto).toContain("· Omar: 5 nuevos");
    expect(variablesWhatsappReporte({ ...base, mes: null, equipo: [{ nombre: "Omar", embudo: base.embudo, unidadesMes: 6 }] })[7]).toBe("6 en la agencia");
  });

  it("las variables de WhatsApp son 9 y sin saltos de línea", () => {
    const v = variablesWhatsappReporte({ ...base, foco: "Uno\n\ndos" });
    expect(v).toHaveLength(9);
    expect(v).toEqual(["Alex", "12 al 18 de octubre", "5", "4", "2", "1", "1", "3 (te faltan 4 para 7)", "Uno dos"]);
    expect(v.some((x) => /\n|\t/.test(x))).toBe(false);
  });
});
