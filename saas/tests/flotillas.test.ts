import { describe, expect, it } from "vitest";
import { ahorroFlotilla, MODELOS_POR_TIPO, resumenFlotilla, SUPUESTOS, TIPOS_FLOTILLA } from "@/lib/dominio/flotillas";
import { decidirAcceso } from "@/lib/dominio/acceso";

describe("ahorro de flotilla", () => {
  it("da los mismos números que la calculadora de Excel con los supuestos de ejemplo", () => {
    const a = ahorroFlotilla(10, 100);
    expect(a.kmMes).toBe(2400);
    expect(a.gasolinaMes).toBe(4800);
    expect(a.electrico.energiaMes).toBeCloseTo(864, 6);
    expect(a.electrico.ahorroUnidadMes).toBeCloseTo(4936, 6);
    expect(a.electrico.ahorroAnual).toBeCloseTo(592320, 6);
    expect(a.hibrido.energiaMes).toBeCloseTo(1695.2727, 3);
    expect(a.hibrido.ahorroAnual).toBeCloseTo(444567.27, 1);
  });

  it("acepta supuestos del cliente", () => {
    const a = ahorroFlotilla(1, 50, { rendimiento: 10, precioGas: 25 });
    expect(a.gasolinaMes).toBe(50 * SUPUESTOS.dias / 10 * 25);
  });

  it("no se rompe con datos vacíos o absurdos", () => {
    const a = ahorroFlotilla(Number.NaN, -5, { rendimiento: 0, rendHev: 0 });
    expect(a.kmMes).toBe(0);
    expect(a.gasolinaMes).toBe(0);
    expect(Number.isFinite(a.electrico.ahorroAnual)).toBe(true);
    expect(a.electrico.ahorroAnual).toBe(0);
  });

  it("tiene modelos recomendados para cada tipo de cliente", () => {
    for (const t of TIPOS_FLOTILLA) expect(MODELOS_POR_TIPO[t].length).toBeGreaterThan(0);
  });

  it("arma las notas del CRM y el WhatsApp con el mejor ahorro", () => {
    const a = ahorroFlotilla(10, 100);
    const r = resumenFlotilla({ nombre: "Ana López", organizacion: "Distribuidora Norte", tipo: "Empresa", unidades: 10, kmDia: 100, correo: "ana@ejemplo.mx" }, a);
    expect(r.notas).toContain("Flotilla · Empresa: Distribuidora Norte");
    expect(r.notas).toContain("Correo: ana@ejemplo.mx");
    expect(r.whatsapp).toContain("Hola, soy Ana de Distribuidora Norte.");
    expect(r.whatsapp).toContain("10 unidades");
    expect(r.mejor).toBeCloseTo(592320, 6);
  });
});

describe("acceso a la landing de flotillas", () => {
  it("es pública, sin abrir otras rutas que empiecen igual", () => {
    expect(decidirAcceso("/flotillas", false)).toBe("pasar");
    expect(decidirAcceso("/flotillasx", false)).toBe("al-login");
  });
});
