"use client";

import { useState, useSyncExternalStore } from "react";
import { Download, FileSpreadsheet, Share2 } from "lucide-react";
import { Boton } from "@/components/ui";
import { descargarArchivo, useAviso } from "@/components/cliente";
import { cargarFuentes, dibujarReporte, type DatosImagen } from "@/components/tablero/imagen-reporte";

const sinSuscripcion = () => () => {};
let compartirCache: boolean | null = null;
function puedeCompartirArchivos() {
  if (compartirCache == null) {
    try { compartirCache = typeof navigator.canShare === "function" && navigator.canShare({ files: [new File([""], "x.png", { type: "image/png" })] }); } catch { compartirCache = false; }
  }
  return compartirCache;
}

export function AccionesTablero({ datos, nombreArchivo, csv }: { datos: DatosImagen; nombreArchivo: string; csv: string }) {
  const avisar = useAviso();
  const [ocupado, setOcupado] = useState(false);
  const compartible = useSyncExternalStore(sinSuscripcion, puedeCompartirArchivos, () => false);

  async function generar(): Promise<Blob | null> {
    await cargarFuentes();
    const cv = dibujarReporte(datos);
    return new Promise((res) => cv.toBlob((b) => res(b), "image/png"));
  }
  async function descargar() {
    setOcupado(true);
    try {
      const b = await generar();
      if (!b) { avisar("No se pudo generar la imagen.", "error"); return; }
      descargarArchivo(`${nombreArchivo}.png`, b);
      avisar("Imagen descargada");
    } finally { setOcupado(false); }
  }
  async function compartir() {
    setOcupado(true);
    try {
      const b = await generar();
      if (!b) return;
      await navigator.share({ files: [new File([b], `${nombreArchivo}.png`, { type: "image/png" })], title: datos.titulo });
    } catch { /* el usuario canceló */ } finally { setOcupado(false); }
  }
  return (
    <>
      {compartible ? <Boton icono={Share2} onClick={compartir} disabled={ocupado}>Compartir</Boton> : null}
      <Boton variante={compartible ? "secundario" : "primario"} icono={Download} onClick={descargar} disabled={ocupado}>{ocupado ? "Generando…" : "Descargar imagen"}</Boton>
      <Boton variante="secundario" icono={FileSpreadsheet} onClick={() => { descargarArchivo(`${nombreArchivo}.csv`, new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })); avisar("Excel (CSV) descargado"); }}>Exportar Excel</Boton>
    </>
  );
}
