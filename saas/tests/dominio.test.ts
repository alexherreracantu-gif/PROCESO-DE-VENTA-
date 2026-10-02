import { describe, expect, it } from "vitest";
import { aportacionParaPagoFirma, convenio, cotizar, mensualidad, tasaMensual, truncar, type ModeloCotizable } from "@/lib/dominio/banorte";
import { diasRestantes, fechaCorta, mesAnterior, nombreMes, rangoMes, sumarDias } from "@/lib/dominio/fechas";
import { normalizarVin, revisarVin } from "@/lib/dominio/vin";
import { avanceExpediente, pasosAplicables } from "@/lib/dominio/catalogos";
import { penetracion, proyeccion, resumir, ritmoNecesario } from "@/lib/dominio/reportes";
import { enlaceWhatsApp, iniciales } from "@/lib/dominio/formato";

const king: ModeloCotizable = { clave: "king-gl", anio: 2027, motor: "hibrido", precio: 524900, bono: 25000 };
const songPlus: ModeloCotizable = { clave: "song-plus", anio: 2026, motor: "hibrido", precio: 778800, bono: 78000 };
const dolphin: ModeloCotizable = { clave: "dolphin-mini-300", anio: 2026, motor: "electrico", precio: 399800, bono: 25000 };

describe("Banorte", () => {
  it("trunca a centavos sin redondear", () => {
    expect(truncar(10.999)).toBe(10.99);
    expect(truncar(0.025 * 1.16 * 449900)).toBe(13047.09); // 13047.0999… en binario, igual que el cotizador oficial
    expect(truncar(Number.NaN)).toBe(0);
  });

  it("calcula la tasa mensual con IVA y año comercial", () => {
    expect(tasaMensual(0.1088)).toBeCloseTo((0.1088 * 1.16 * 30.41) / 360, 12);
  });

  it("calcula la mensualidad con anualidad truncada", () => {
    const r = tasaMensual(0.0788);
    const esperado = Math.trunc(((402062 * r) / (1 - Math.pow(1 + r, -60))) * 100) / 100;
    expect(mensualidad(402062, 0.0788, 60)).toBe(esperado);
    expect(mensualidad(0, 0.1, 60)).toBe(0);
  });

  it("elige el convenio por % de enganche", () => {
    expect(convenio(0.1, songPlus)).toMatchObject({ tasa: 0.1499, comision: 0.025 });
    expect(convenio(0.2, songPlus).tasa).toBe(0.1388);
    expect(convenio(0.25, songPlus).tasa).toBe(0.1188);
    expect(convenio(0.4296, songPlus).tasa).toBe(0.1088);
    expect(convenio(0.5, songPlus).nombre).toBe("BYD 7.88%");
    expect(convenio(0.5, king).nombre).toBe("BYD KING DM-i 2027");
    expect(convenio(0.5, { ...king, anio: 2026 }).nombre).toBe("BYD 7.88%");
    expect(convenio(0.5, dolphin)).toMatchObject({ tasa: 0.0718, comision: 0.025 });
  });

  it("aplica el bono solo desde 5% de enganche", () => {
    const sin = cotizar({ modelo: king, aportacion: 0, accesorios: 0, garantia: 0, plazo: 72, placas: 5866, tramites: 0 });
    expect(sin.bonoAplica).toBe(false);
    expect(sin.enganche).toBe(0);
    const con = cotizar({ modelo: king, aportacion: 50000, accesorios: 0, garantia: 0, plazo: 72, placas: 5866, tramites: 0 });
    expect(con.bonoAplica).toBe(true);
    expect(con.enganche).toBe(75000);
    expect(con.monto).toBe(449900);
    expect(con.comision).toBe(13047.09);
    expect(con.convenio.nombre).toBe("Sin convenio");
    expect(con.pagoFirma).toBe(truncar(50000 + 13047.09 + 5866));
  });

  it("suma accesorios y garantía al monto a financiar", () => {
    const q = cotizar({ modelo: songPlus, aportacion: 324000, accesorios: 6500, garantia: 9082, plazo: 60, placas: 0, tramites: 0 });
    expect(q.monto).toBe(778800 + 6500 + 9082 - (324000 + 78000));
    expect(q.pctEnganche).toBeCloseTo(402000 / 785300, 10);
    expect(q.convenio.tasa).toBe(0.0788); // 51.2% → BYD 7.88%
  });

  it("encuentra la aportación para un pago a la firma exacto", () => {
    const base = { modelo: king, accesorios: 0, garantia: 0, plazo: 72, placas: 5866, tramites: 0 };
    for (const D of [80000, 150000, 300000]) {
      const a = aportacionParaPagoFirma(base, D);
      const q = cotizar({ ...base, aportacion: a });
      expect(Math.abs(q.pagoFirma - D)).toBeLessThan(0.05);
    }
  });
});

describe("fechas", () => {
  it("arma rangos y nombres de mes", () => {
    expect(rangoMes("2026-10")).toEqual({ desde: "2026-10-01", hasta: "2026-11-01" });
    expect(rangoMes("2026-12")).toEqual({ desde: "2026-12-01", hasta: "2027-01-01" });
    expect(mesAnterior("2027-01")).toBe("2026-12");
    expect(nombreMes("2026-10")).toBe("octubre 2026");
    expect(fechaCorta("2026-10-02")).toBe("2 oct");
    expect(sumarDias("2026-10-30", 4)).toBe("2026-11-03");
  });
  it("cuenta días restantes incluyendo hoy", () => {
    expect(diasRestantes("2026-10", "2026-10-02")).toBe(30);
    expect(diasRestantes("2026-09", "2026-10-02")).toBe(0);
    expect(diasRestantes("2026-11", "2026-10-02")).toBe(30);
  });
});

describe("VIN", () => {
  it("normaliza y valida", () => {
    expect(normalizarVin(" lgxce4cb1r0012345 ")).toBe("LGXCE4CB1R0012345");
    expect(revisarVin("LGXCE4CB1R0012345").valido).toBe(true);
    expect(revisarVin("LGXCE4CB1R00123").valido).toBe(false);
    expect(revisarVin("LGXCE4CBIR0012345").tono).toBe("error");
    expect(revisarVin("").valido).toBe(true);
  });
});

describe("expediente", () => {
  it("se salta los pasos del banco si es de contado", () => {
    expect(pasosAplicables("Crédito Banorte")).toHaveLength(11);
    expect(pasosAplicables("Contado")).toHaveLength(8);
    const a = avanceExpediente("Contado", { cliente: "2026-10-01", cotizacion: "2026-10-01" });
    expect(a).toMatchObject({ total: 8, hechos: 2 });
    expect(a.siguiente?.id).toBe("separacion");
  });
});

describe("reportes", () => {
  const ventas = [
    { id: "1", fecha: "2026-10-01", vendedor_id: "omar", modelo_id: "king", color: "Blanco", estatus: "facturada", productos: ["garantia", "placas"] },
    { id: "2", fecha: "2026-10-02", vendedor_id: "omar", modelo_id: "song", color: "Gris", estatus: "entregada", productos: ["placas", "placas"] },
    { id: "3", fecha: "2026-10-03", vendedor_id: "mariana", modelo_id: "king", color: "Blanco", estatus: "facturada", productos: [] },
    { id: "4", fecha: "2026-10-03", vendedor_id: "mariana", modelo_id: "king", color: "Rojo", estatus: "cancelada", productos: ["garantia"] },
  ];
  it("resume sin contar canceladas", () => {
    const r = resumir(ventas, [{ id: "garantia" }, { id: "placas" }, { id: "seguro" }]);
    expect(r.unidades).toBe(3);
    expect(r.entregadas).toBe(1);
    expect(r.totalProductos).toBe(3);
    expect(r.porProducto).toEqual({ garantia: 1, placas: 2, seguro: 0 });
    expect(r.porModelo[0]).toEqual({ id: "king", n: 2 });
    expect(r.porColor[0]).toEqual({ id: "Blanco", n: 2 });
    expect(r.porVendedor.omar).toEqual({ unidades: 2, productos: 3 });
    expect(penetracion(r, "placas")).toBeCloseTo(2 / 3);
    expect(penetracion(resumir([]), "placas")).toBe(0);
  });
  it("calcula ritmo y proyección", () => {
    expect(ritmoNecesario(14, 3, 28)).toBeCloseTo(11 / 4);
    expect(ritmoNecesario(14, 15, 10)).toBe(0);
    expect(ritmoNecesario(14, 13, 0)).toBe(7);
    expect(proyeccion(5, 10, 31)).toBe(16);
  });
});

describe("formato", () => {
  it("arma iniciales y enlaces de WhatsApp", () => {
    expect(iniciales("Jorge Cabral")).toBe("JC");
    expect(enlaceWhatsApp("81 1234 5678", "Hola")).toBe("https://wa.me/528112345678?text=Hola");
  });
});
