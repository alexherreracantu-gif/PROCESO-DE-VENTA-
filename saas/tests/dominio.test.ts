import { describe, expect, it } from "vitest";
import { aportacionParaPagoFirma, convenio, cotizar, mensualidad, tasaMensual, truncar, type ModeloCotizable } from "@/lib/dominio/banorte";
import { diasRestantes, fechaCorta, mesAnterior, nombreMes, rangoMes, sumarDias } from "@/lib/dominio/fechas";
import { normalizarVin, revisarVin } from "@/lib/dominio/vin";
import { calcularCuenta, type Movimiento } from "@/lib/dominio/cuenta";
import { evaluarProceso, NO_APLICA, TODOS_REQUISITOS, type EntradaProceso } from "@/lib/dominio/proceso";
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

const mov = (id: string, tipo: "cargo" | "pago", concepto: string, monto: number, aplica_a: string | null = tipo === "pago" ? "factura" : null): Movimiento =>
  ({ id, tipo, concepto, aplica_a, monto, fecha: "2026-09-20", forma: null, referencia: null, notas: null });

describe("cuenta del cliente", () => {
  // Crédito típico: factura, garantía, separación a Accesorios, bono, enganche y desembolso.
  const movimientos = [
    mov("c1", "cargo", "garantia_ext", 9082),
    mov("p1", "pago", "separacion", 5000, "accesorios"),
    mov("p2", "pago", "bono", 59976),
    mov("p3", "pago", "cliente", 46419.59),
    mov("p4", "pago", "desembolso", 393404.41),
  ];
  it("suma cargos y pagos al centavo y dice si hay adeudo", () => {
    const c = calcularCuenta(499800, movimientos, { monto: 374850 });
    expect(c.totalCargos).toBe(508882);
    expect(c.totalPagos).toBe(504800);
    expect(c.saldo).toBe(-4082);
    expect(c.sinAdeudo).toBe(false);
    expect(c.diferenciaDesembolso).toBe(18554.41);
    const pagado = calcularCuenta(499800, [...movimientos, mov("p5", "pago", "cliente", 4082, "garantia_ext")]);
    expect(pagado.saldo).toBe(0);
    expect(pagado.sinAdeudo).toBe(true);
  });
  it("cuadra por concepto como la aplicación de pago", () => {
    const c = calcularCuenta(499800, movimientos);
    const por = Object.fromEntries(c.porConcepto.map((x) => [x.concepto, x.pendiente]));
    expect(por.factura).toBe(0);
    expect(por.garantia_ext).toBe(9082);
    expect(por.accesorios).toBe(-5000);
    expect(c.porConcepto.map((x) => x.concepto)).toEqual(["factura", "accesorios", "garantia_ext"]);
  });
  it("sin valor factura no hay veredicto", () => {
    expect(calcularCuenta(null, []).sinAdeudo).toBe(false);
    expect(calcularCuenta(null, []).completo).toBe(false);
  });
});

describe("proceso del cliente", () => {
  const base: EntradaProceso = { forma_pago: "Crédito Banorte", plaza: "Monterrey", valor_factura: null, expediente: {}, documentos: [], movimientos: [] };
  const ids = (e: EntradaProceso) => evaluarProceso(e).etapas.flatMap((x) => x.requisitos).map((r) => r.id);

  it("arma los requisitos según crédito, contado y Piedras Negras", () => {
    const credito = ids(base);
    expect(credito[0]).toBe("ine");
    expect(credito).toContain("aprobacion");
    expect(credito).not.toContain("permiso");
    expect(credito.at(-1)).toBe("entrega");
    const contado = ids({ ...base, forma_pago: "Contado" });
    expect(contado).not.toContain("aprobacion");
    expect(contado).not.toContain("desembolso");
    expect(evaluarProceso({ ...base, forma_pago: "Contado" }).etapas[0].label).toBe("Documentos del cliente");
    expect(ids({ ...base, plaza: "Piedras Negras" })).toEqual(expect.arrayContaining(["permiso", "permiso_pago"]));
    expect(TODOS_REQUISITOS.every((r, i, a) => a.findIndex((x) => x.id === r.id) === i)).toBe(true);
  });

  it("un documento cuenta con archivo, en físico o como no aplica", () => {
    const p = evaluarProceso({ ...base, documentos: [{ tipo: "ine", movimiento_id: null }], expediente: { curp: "2026-09-01", buro: NO_APLICA } });
    const r = Object.fromEntries(p.etapas[0].requisitos.map((x) => [x.id, x]));
    expect(r.ine.estado).toBe("hecho");
    expect(r.curp).toMatchObject({ estado: "hecho", detalle: "Entregado en físico" });
    expect(r.buro.estado).toBe("na");
    expect(r.domicilio.estado).toBe("pendiente");
    expect(p.etapas[0]).toMatchObject({ hechos: 2, total: 6 });
    expect(p.siguiente?.id).toBe("domicilio");
  });

  it("pide recibo de cada pago, cargo de cada producto y cuadre sin adeudo", () => {
    const e: EntradaProceso = {
      ...base, valor_factura: 100000, productosVendidos: ["garantia"],
      movimientos: [mov("p1", "pago", "separacion", 5000, "accesorios"), mov("p2", "pago", "cliente", 95000), mov("p3", "pago", "bono", 1000)],
      documentos: [{ tipo: "recibo", movimiento_id: "p1" }],
    };
    const estado = (x: EntradaProceso) => Object.fromEntries(evaluarProceso(x).etapas.flatMap((et) => et.requisitos).map((r) => [r.id, r]));
    let r = estado(e);
    expect(r.recibos).toMatchObject({ estado: "pendiente", detalle: "1 de 2 pagos con recibo" });
    expect(r.cargos.estado).toBe("pendiente");
    expect(r.cuadre).toMatchObject({ estado: "hecho", detalle: "Sin adeudo · saldo a favor $1,000.00" });
    r = estado({ ...e, movimientos: [...e.movimientos, mov("c1", "cargo", "garantia_ext", 9082)], documentos: [...e.documentos, { tipo: "recibo", movimiento_id: "p2" }] });
    expect(r.recibos.estado).toBe("hecho");
    expect(r.cargos.estado).toBe("hecho");
    expect(r.cuadre).toMatchObject({ estado: "pendiente", detalle: "Falta cubrir $8,082.00" });
  });

  it("solo está listo para la salida con todo al 100%", () => {
    const todo: Record<string, string> = {};
    for (const r of TODOS_REQUISITOS) if (r.tipo !== "auto" && r.id !== "entrega") todo[r.id] = "2026-10-01";
    const e: EntradaProceso = { ...base, valor_factura: 1000, expediente: todo, movimientos: [mov("p1", "pago", "cliente", 1000)], documentos: [{ tipo: "recibo", movimiento_id: "p1" }] };
    const p = evaluarProceso(e);
    expect(p.pendientes.map((x) => x.id)).toEqual(["entrega"]);
    expect(p.listoParaSalida).toBe(true);
    expect(evaluarProceso({ ...e, movimientos: [mov("p1", "pago", "cliente", 999)] }).listoParaSalida).toBe(false);
    expect(evaluarProceso({ ...e, expediente: { ...todo, entrega: "2026-10-03" } }).pct).toBe(1);
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

import { buscarModelo, elegirAsesor, normalizarLead } from "@/lib/dominio/leads";
describe("prospectos entrantes", () => {
  it("normaliza la landing y Meta", () => {
    const l = normalizarLead({ nombre: "Ana López", telefono: "+52 1 81 1234 5678", modelo: "BYD King GL DM-i", utm_source: "facebook", cuando: "Esta semana", municipio: "San Nicolás" });
    expect(l).toMatchObject({ nombre: "Ana López", telefono: "8112345678", origen: "Meta Ads", calor: "alta" });
    expect("notas" in l && l.notas).toContain("Municipio: San Nicolás");
    expect(normalizarLead({ full_name: "Sin tel" })).toEqual({ error: "Falta un teléfono de 10 dígitos." });
  });
  it("encuentra el modelo y reparte por turno", () => {
    const modelos = [{ id: "a", nombre: "King GL DM-i" }, { id: "b", nombre: "Song Plus DM-i" }];
    expect(buscarModelo("BYD King GL DM-i", modelos)?.id).toBe("a");
    expect(buscarModelo("song plus", modelos)?.id).toBe("b");
    expect(buscarModelo("Otro / aún no sé", modelos)).toBeNull();
    expect(elegirAsesor([{ id: "omar", hoy: 2, total: 9 }, { id: "mariana", hoy: 1, total: 12 }, { id: "leo", hoy: 1, total: 4 }])).toBe("leo");
  });
});

describe("generador de anuncios", async () => {
  const { escenario, textoLegal, textosAnuncio, telefonoBonito, vigencia, tasaTexto, condicionesModelo } = await import("@/lib/anuncios");
  const song = { clave: "song-plus", nombre: "Song Plus DM-i", anio: 2026, motor: "hibrido" as const, precio: 778800, bono: 78000, descripcion: "SUV de volumen premium." };
  const kingGs = { ...song, clave: "king-gs", nombre: "King GS DM-i", anio: 2027, precio: 579900, bono: 25000, descripcion: "King con más equipo. Bono flexible de octubre solo con interior gris/azul." };

  it("calcula la mensualidad con el cotizador Banorte (50% de enganche → 7.88%)", () => {
    const e = escenario(song, 0.5, 72);
    expect(e.tasa).toBe(0.0788);
    expect(e.pctEnganche).toBeCloseTo(0.5, 3);
    expect(e.bonoAplica).toBe(true);
    expect(e.mensualidad).toBeGreaterThan(6000);
    expect(e.mensualidad).toBeLessThan(8000);
  });

  it("la letra chica lleva precio con IVA, condiciones del bono y de la mensualidad, y la vigencia del mes", () => {
    const t = textoLegal({ modelo: kingGs, hoy: "2026-10-03", conBono: true, mensualidad: { pctEnganche: 0.5, plazo: 72, tasa: 0.0788 } });
    expect(t).toContain("$579,900 con IVA incluido");
    expect(t).toContain("BBVA, Santander, Banorte o KUNA desde 5% de enganche");
    expect(t).toContain("solo con interior gris/azul");
    expect(t).toContain("enganche de 50%, plazo de 72 meses y tasa fija anual de 7.88%");
    expect(t).toContain("31 de octubre de 2026");
    const sinBono = textoLegal({ modelo: kingGs, hoy: "2026-10-03", conBono: false });
    expect(sinBono).not.toContain("Bono flexible");
  });

  it("formatea teléfono, vigencia y tasa", () => {
    expect(telefonoBonito("528112345678")).toBe("81 1234 5678");
    expect(telefonoBonito("81-1234-5678")).toBe("81 1234 5678");
    expect(vigencia("2026-02-10")).toBe("28 de febrero de 2026");
    expect(tasaTexto(0.0788)).toBe("7.88%");
    expect(tasaTexto(0.1)).toBe("10%");
    expect(condicionesModelo("SUV familiar. Precio especial de octubre.")).toEqual(["Precio especial de octubre."]);
    expect(condicionesModelo("SUV de volumen premium. El bono más visible del piso.")).toEqual([]);
  });

  it("arma los textos para redes con los datos del asesor", () => {
    const t = textosAnuncio({ modelo: song, conBono: true, mensualidad: { valor: 7070, tasa: 0.0788 }, asesor: "Omar", telefono: "8112345678", agencia: "BYD Cumbres · Park Point", ciudad: "Monterrey, N.L." });
    expect(t.principal).toContain("BYD Song Plus DM-i 2026");
    expect(t.principal).toContain("Bono flexible de $78,000");
    expect(t.principal).toContain("81 1234 5678 (Omar)");
    expect(t.hashtags).toContain("#BYDSongPlusDMi");
    expect(t.titulo).toBe("BYD Song Plus DM-i 2026: bono de $78,000");
  });
});

describe("recibos que cumplen documentos", () => {
  it("el recibo de la separación, del desembolso y del bono cuentan para su requisito", () => {
    const p = evaluarProceso({
      forma_pago: "Crédito Banorte", plaza: "Monterrey", valor_factura: 1000, expediente: {},
      movimientos: [mov("p1", "pago", "separacion", 500, "accesorios"), mov("p2", "pago", "desembolso", 400), mov("p3", "pago", "bono", 100)],
      documentos: [{ tipo: "recibo", movimiento_id: "p1" }, { tipo: "recibo", movimiento_id: "p2" }, { tipo: "recibo", movimiento_id: "p3" }],
    });
    const r = Object.fromEntries(p.etapas.flatMap((et) => et.requisitos).map((x) => [x.id, x.estado]));
    expect([r.separacion, r.desembolso, r.nota_credito, r.recibos]).toEqual(["hecho", "hecho", "hecho", "hecho"]);
  });
});

import { alertasVenta, comisionVenta, mensajeDocumentos, postventa } from "@/lib/dominio/seguimiento";
import { paqueteExpediente } from "@/lib/dominio/paquete";
describe("seguimiento", () => {
  const base: EntradaProceso = { forma_pago: "Crédito Banorte", plaza: "Monterrey", valor_factura: 500000, expediente: { ine: "2026-10-01" }, documentos: [], movimientos: [] };
  const datos = { cliente: "maría lópez", asesor: "Jorge", agencia: "BYD Cumbres", modelo: "King 2027", contado: false };

  it("arma el WhatsApp con documentos y firmas pendientes, sin el saldo mientras falte el banco", () => {
    const m = mensajeDocumentos(datos, evaluarProceso(base))!;
    expect(m).toMatch(/^Hola María, soy Jorge de BYD Cumbres\. Para avanzar con tu King 2027/);
    expect(m).toContain("• CURP");
    expect(m).not.toContain("INE");
    expect(m).toContain("✍️ Pasar a firmar");
    expect(m).toContain("• Autorización de Buró de Crédito");
    expect(m).not.toContain("Saldo");
    const conBanco = { ...base, movimientos: [mov("d", "pago", "desembolso", 400000)] };
    expect(mensajeDocumentos(datos, evaluarProceso(conBanco))).toContain("Saldo pendiente: $100,000.00");
  });

  it("no manda mensaje si el cliente ya entregó todo", () => {
    const todo: Record<string, string> = {};
    for (const r of TODOS_REQUISITOS) if (r.cliente) todo[r.id] = "2026-10-01";
    expect(mensajeDocumentos({ ...datos, contado: true }, evaluarProceso({ ...base, forma_pago: "Contado", valor_factura: null, expediente: todo }))).toBeNull();
  });

  it("calcula la postventa desde la fecha de entrega", () => {
    const pv = postventa("2026-10-01", { pv_resena: "2026-10-02" }, "luis gonzález", "BYD Cumbres", "2026-10-12");
    expect(pv.map((x) => [x.id, x.fecha, !!x.hecho, x.vencido])).toEqual([
      ["pv_resena", "2026-10-02", true, false], ["pv_video", "2026-10-02", false, true], ["pv_llamada", "2026-10-08", false, true],
      ["pv_referidos", "2026-10-11", false, true], ["pv_servicio", "2027-03-20", false, false],
    ]);
    expect(pv[3].mensaje).toMatch(/^Hola Luis,/);
  });

  it("avisa entregas en riesgo, expedientes detenidos, recibos y adeudos", () => {
    const v = { estatus: "facturada", forma_pago: "Contado", fecha_entrega: "2026-10-04", updated_at: "2026-09-20T10:00:00Z", documentos: [], movimientos: [{ id: "p1", tipo: "pago", concepto: "cliente", fecha: "2026-09-25" }] };
    const p = evaluarProceso({ ...base, forma_pago: "Contado", movimientos: [mov("p1", "pago", "cliente", 1000)] });
    const a = alertasVenta(v, p, "2026-10-03");
    expect(a.map((x) => [x.tipo, x.grave])).toEqual([["entrega", true], ["detenido", false], ["recibo", false], ["adeudo", true]]);
    expect(a[0].texto).toMatch(/^Entrega es mañana · faltan \d+ pendientes$/);
    expect(a[1].texto).toBe("Sin movimiento desde hace 8 días");
    expect(alertasVenta({ ...v, estatus: "entregada" }, p, "2026-10-03")).toEqual([]);
  });

  it("calcula la comisión por unidad, % de factura y productos (con el precio del cargo)", () => {
    const cat = [{ id: "g", clave: "garantia", nombre: "Garantía extendida", precio: 9082 }, { id: "c", clave: "cerocible", nombre: "Cerocible", precio: 4592 }];
    const esq = { por_unidad: 1500, pct_factura: 0.2, productos: { garantia: { pct: 10 }, cerocible: { fijo: 300 } } };
    const c = comisionVenta(esq, { estatus: "facturada", valor_factura: 500000, productos: ["g", "c"], movimientos: [{ tipo: "cargo", concepto: "garantia_ext", monto: 10000 }] }, cat);
    expect(c.unidad).toBe(2500);
    expect(c.productos).toEqual([{ nombre: "Garantía extendida", monto: 1000 }, { nombre: "Cerocible", monto: 300 }]);
    expect(c.total).toBe(3800);
    expect(comisionVenta(esq, { estatus: "cancelada", valor_factura: 500000, productos: [], movimientos: [] }, cat).total).toBe(0);
  });

  it("acomoda el ZIP por etapa, con recibos, enlaces y la cuenta en CSV", () => {
    const doc = (id: string, tipo: string, nombre: string, extra: Partial<{ movimiento_id: string; enlace: string }> = {}) =>
      ({ id, tipo, nombre, movimiento_id: extra.movimiento_id ?? null, enlace: extra.enlace ?? null, mime: null, tamano: null, created_at: "2026-10-01T00:00:00Z" });
    const z = paqueteExpediente({
      cliente: "Ana Pérez", folio: 7,
      documentos: [doc("1", "ine", "ine.pdf"), doc("2", "recibo", "r.pdf", { movimiento_id: "p1" }), doc("3", "factura", "Factura", { enlace: "https://drive.google.com/x" })],
      movimientos: [mov("p1", "pago", "separacion", 5000, "accesorios")],
    });
    expect(z.nombre).toBe("Expediente 7 Ana Pérez");
    expect(z.archivos).toEqual([
      { id: "1", ruta: "1 Crédito y documentos del cliente/INE - ine.pdf" },
      { id: "2", ruta: "4 Pagos y cuadre/Recibos/2026-09-20 Separación - r.pdf" },
    ]);
    expect(z.extras.map((x) => x.ruta)).toEqual(["Cuenta del cliente.csv", "Enlaces de Drive.txt"]);
    expect(z.extras[0].texto).toContain("2026-09-20,Pago,Separación,Accesorios,,,5000.00,");
  });
});

import { textoSaldo } from "@/lib/dominio/seguimiento";
describe("texto del saldo", () => {
  it("en crédito, sin desembolso, lo que falta es del banco", () => {
    const c = { completo: true, sinAdeudo: false, saldo: -1234.5, porOrigen: [] as { origen: string }[] };
    expect(textoSaldo("Crédito Banorte", c)).toEqual({ texto: "Espera desembolso", tono: "warn" });
    expect(textoSaldo("Crédito Banorte", { ...c, porOrigen: [{ origen: "desembolso" }] })).toEqual({ texto: "Debe $1,234.50", tono: "bad" });
    expect(textoSaldo("Contado", { ...c, saldo: -500 })).toEqual({ texto: "Debe $500", tono: "bad" });
    expect(textoSaldo("Contado", { ...c, sinAdeudo: true }).texto).toBe("Sin adeudo");
  });
});
