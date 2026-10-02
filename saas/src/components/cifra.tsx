"use client";

import { useEffect, useState } from "react";

const PARTES = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/;

/** Número que cuenta desde 0 al aparecer (ej. "4%", "1.0", "$524,900"). Sin animación si el sistema pide menos movimiento. */
export function Cifra({ valor, duracion = 900 }: { valor: string; duracion?: number }) {
  const [mostrado, setMostrado] = useState(valor);
  useEffect(() => {
    const m = PARTES.exec(valor);
    if (!m || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const [, antes, numero, despues] = m;
    const final = Number(numero.replace(/,/g, ""));
    if (!final) return;
    const decimales = numero.includes(".") ? numero.split(".")[1].length : 0;
    const formato = (n: number) => numero.includes(",")
      ? n.toLocaleString("es-MX", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
      : n.toFixed(decimales);
    let raf = 0;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const t = Math.min((ahora - inicio) / duracion, 1);
      setMostrado(t < 1 ? `${antes}${formato(final * (1 - Math.pow(1 - t, 3)))}${despues}` : valor);
      if (t < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [valor, duracion]);
  return <span className="tabular-nums">{mostrado}</span>;
}
