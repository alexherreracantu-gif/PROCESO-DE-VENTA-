/** Cómo se acomoda el expediente al descargarlo en ZIP: una carpeta por etapa, como en Drive. */
import { labelCargo, labelOrigen, type Movimiento } from "./cuenta";
import { ETAPAS_PROCESO, type DocumentoResumen } from "./proceso";

const limpio = (t: string) => t.normalize("NFC").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 90);

export function paqueteExpediente(v: { cliente: string; folio: number; documentos: DocumentoResumen[]; movimientos: Movimiento[] }) {
  const carpeta = new Map<string, { carpeta: string; label: string }>();
  ETAPAS_PROCESO.forEach((e, i) => e.requisitos.forEach((r) => carpeta.set(r.id, { carpeta: `${i + 1} ${e.label}`, label: r.label })));
  const etapaPagos = ETAPAS_PROCESO.findIndex((e) => e.id === "pagos");
  const pagos = new Map(v.movimientos.map((m) => [m.id, m]));

  const archivos: { id: string; ruta: string }[] = [];
  const enlaces: string[] = [];
  for (const d of v.documentos) {
    let ruta: string;
    if (d.movimiento_id) {
      const m = pagos.get(d.movimiento_id);
      ruta = `${etapaPagos + 1} ${ETAPAS_PROCESO[etapaPagos].label}/Recibos/${limpio(`${m ? `${m.fecha} ${labelOrigen(m.concepto)}` : "Recibo"} - ${d.nombre}`)}`;
    } else {
      const c = carpeta.get(d.tipo);
      ruta = `${c ? c.carpeta : "Otros"}/${limpio(`${c ? c.label : d.tipo} - ${d.nombre}`)}`;
    }
    if (d.enlace) enlaces.push(`${ruta.replace(/\/[^/]*$/, "")} · ${d.nombre}: ${d.enlace}`);
    else archivos.push({ id: d.id, ruta });
  }

  const filas = [["Fecha", "Tipo", "Concepto", "Aplicado a", "Forma de pago", "Referencia", "Monto", "Nota"],
    ...v.movimientos.map((m) => [m.fecha, m.tipo === "cargo" ? "Cargo" : "Pago", m.tipo === "cargo" ? labelCargo(m.concepto) : labelOrigen(m.concepto),
      m.tipo === "pago" ? labelCargo(m.aplica_a) : "", m.forma ?? "", m.referencia ?? "", m.monto.toFixed(2), m.notas ?? ""])];
  const csv = "﻿" + filas.map((f) => f.map((x) => /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x).join(",")).join("\r\n");
  const extras = [{ ruta: "Cuenta del cliente.csv", texto: csv }];
  if (enlaces.length) extras.push({ ruta: "Enlaces de Drive.txt", texto: enlaces.join("\r\n") });
  return { nombre: limpio(`Expediente ${v.folio} ${v.cliente}`), archivos, extras };
}
