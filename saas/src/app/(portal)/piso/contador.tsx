"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { BotonCopiar, useAviso } from "@/components/cliente";
import { BotonEnlace, Tarjeta, TituloTarjeta } from "@/components/ui";
import { CORTE } from "@/lib/dominio/catalogos";
import { enlaceWhatsApp } from "@/lib/dominio/formato";
import { guardarCorte } from "./acciones";

export function Contador({ fecha, nombre, inicial }: { fecha: string; nombre: string; inicial: Record<string, number> }) {
  const avisar = useAviso();
  const [valores, setValores] = useState<Record<string, number>>(inicial);
  const [estado, setEstado] = useState<"guardado" | "pendiente" | "guardando" | "error">("guardado");
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimo = useRef(JSON.stringify(inicial));

  useEffect(() => () => { if (temporizador.current) clearTimeout(temporizador.current); }, []);

  function cambiar(id: string, d: number) {
    const nuevo = { ...valores, [id]: Math.max(0, (valores[id] ?? 0) + d) };
    setValores(nuevo);
    setEstado("pendiente");
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(async () => {
      const json = JSON.stringify(nuevo);
      if (json === ultimo.current) { setEstado("guardado"); return; }
      setEstado("guardando");
      const r = await guardarCorte({ fecha, valores: nuevo });
      if (r.ok) { ultimo.current = json; setEstado("guardado"); } else { setEstado("error"); avisar(r.error, "error"); }
    }, 800);
  }

  const [a, m, d] = fecha.split("-");
  const hora = new Date().toLocaleTimeString("es-MX", { timeZone: "America/Monterrey", hour: "2-digit", minute: "2-digit", hour12: false });
  const texto = [`Asesor: ${nombre}`, `Fecha: ${d}/${m}/${a}`, `CORTE ${hora}`, ...CORTE.map((c) => `${c.label}: ${valores[c.id] ?? 0}`)].join("\n");
  const etiquetaEstado = { guardado: "Guardado", pendiente: "Sin guardar…", guardando: "Guardando…", error: "No se guardó" }[estado];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Tarjeta>
        <TituloTarjeta titulo="Tu corte" nota={etiquetaEstado} />
        <ul className="grid gap-2">
          {CORTE.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2">
              <span className="flex-1 text-[0.92rem]">{c.label}</span>
              <button type="button" aria-label={`Restar ${c.label}`} onClick={() => cambiar(c.id, -1)} className="grid size-10 place-items-center rounded-lg border border-line bg-surface-2 hover:bg-line"><Minus className="size-4" /></button>
              <span className="num w-10 text-center text-[1.7rem]" aria-live="polite">{valores[c.id] ?? 0}</span>
              <button type="button" aria-label={`Sumar ${c.label}`} onClick={() => cambiar(c.id, 1)} className="grid size-10 place-items-center rounded-lg bg-ink text-on-ink hover:brightness-110"><Plus className="size-4" /></button>
            </li>
          ))}
        </ul>
      </Tarjeta>
      <Tarjeta className="h-fit">
        <TituloTarjeta titulo="Texto del corte" />
        <pre className="whitespace-pre-wrap rounded-xl bg-surface-2 p-4 font-mono text-[0.8rem]">{texto}</pre>
        <div className="mt-3 flex flex-wrap gap-2">
          <BotonCopiar texto={texto} etiqueta="Copiar corte" mensaje="Corte copiado" variante="primario" tamano="md" />
          <BotonEnlace href={enlaceWhatsApp("", texto)} externo variante="whatsapp">Mandar por WhatsApp</BotonEnlace>
        </div>
      </Tarjeta>
    </div>
  );
}
