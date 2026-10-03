"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Check, FolderDown, Loader2, MessageCircle } from "lucide-react";
import { zipSync, strToU8 } from "fflate";
import { Boton, BotonEnlace, cx } from "@/components/ui";
import { copiarTexto, descargarArchivo, useAviso } from "@/components/cliente";
import { marcarPostventa, programarEntrega } from "@/app/(portal)/ventas/expediente";
import { fechaCorta } from "@/lib/dominio/fechas";
import { enlaceWhatsApp } from "@/lib/dominio/formato";
import type { EstadoPostventa } from "@/lib/dominio/seguimiento";

/** Abre WhatsApp con el mensaje listo; sin teléfono, lo copia. */
export function BotonWhatsApp({ telefono, mensaje, texto, tamano = "sm", variante = "whatsapp" }: {
  telefono: string | null; mensaje: string; texto: string; tamano?: "sm" | "md"; variante?: "whatsapp" | "secundario" | "fantasma";
}) {
  const avisar = useAviso();
  if (telefono) return <BotonEnlace href={enlaceWhatsApp(telefono, mensaje)} externo variante={variante} tamano={tamano} icono={MessageCircle}>{texto}</BotonEnlace>;
  return (
    <Boton variante="secundario" tamano={tamano} icono={MessageCircle} title="La venta no tiene teléfono: se copia el mensaje"
      onClick={async () => avisar(await copiarTexto(mensaje) ? "Mensaje copiado. Agrega el teléfono en Editar para mandarlo directo." : "No se pudo copiar", "ok")}>
      {texto}
    </Boton>
  );
}

export function ProgramarEntrega({ ventaId, fecha }: { ventaId: string; fecha: string | null }) {
  const router = useRouter();
  const avisar = useAviso();
  const [valor, setValor] = useState(fecha ?? "");
  const [ocupado, iniciar] = useTransition();
  const cambio = valor !== (fecha ?? "");
  return (
    <form className="mt-2 flex flex-wrap items-center gap-1.5" onSubmit={(e) => { e.preventDefault(); iniciar(async () => {
      const r = await programarEntrega(ventaId, valor || null);
      avisar(r.ok ? r.mensaje ?? "Guardado" : r.error, r.ok ? "ok" : "error");
      if (r.ok) router.refresh();
    }); }}>
      <label htmlFor="prog-entrega" className="sr-only">Fecha de entrega</label>
      <input id="prog-entrega" type="date" className="campo h-8 w-auto py-0 text-[0.82rem]" value={valor} onChange={(e) => setValor(e.target.value)} />
      {cambio ? <Boton type="submit" tamano="sm" icono={CalendarCheck} disabled={ocupado}>{ocupado ? "…" : "Programar"}</Boton> : null}
    </form>
  );
}

export function Postventa({ ventaId, telefono, items }: { ventaId: string; telefono: string | null; items: EstadoPostventa[] }) {
  const router = useRouter();
  const avisar = useAviso();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-1">
      {items.map((it) => (
        <li key={it.id} className={cx("flex flex-wrap items-center gap-3 rounded-xl px-2.5 py-2", it.vencido && "bg-warn-soft/70")}>
          <button type="button" aria-label={it.hecho ? `Desmarcar ${it.label}` : `Marcar ${it.label}`} disabled={ocupado === it.id}
            onClick={() => { setOcupado(it.id); iniciar(async () => {
              const r = await marcarPostventa(ventaId, it.id, !it.hecho);
              setOcupado(null);
              if (!r.ok) avisar(r.error, "error"); else router.refresh();
            }); }}
            className={cx("grid size-7 shrink-0 place-items-center rounded-full border-2 transition", it.hecho ? "border-ok bg-ok text-white" : "border-line text-transparent hover:border-ok")}>
            <Check className="size-4" strokeWidth={3} />
          </button>
          <div className="min-w-0 flex-1">
            <p className={cx("text-[0.9rem] font-semibold", it.hecho && "text-muted line-through decoration-1")}>{it.label}</p>
            <p className={cx("text-[0.78rem]", it.vencido ? "font-semibold text-warn" : "text-muted")}>
              {it.hecho ? `Hecho el ${fechaCorta(it.hecho)}` : it.vencido ? `Toca desde el ${fechaCorta(it.fecha)}` : `Para el ${fechaCorta(it.fecha)}`}
            </p>
          </div>
          {!it.hecho ? <BotonWhatsApp telefono={telefono} mensaje={it.mensaje} texto="Mensaje" variante="secundario" /> : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Descarga todo el expediente en un ZIP, ordenado por etapa. Se arma en el navegador (los archivos
 * bajan directo de Storage), así no hay límite de tamaño del servidor.
 */
export function BotonZip({ nombre, archivos, extras }: { nombre: string; archivos: { id: string; ruta: string }[]; extras: { ruta: string; texto: string }[] }) {
  const avisar = useAviso();
  const [avance, setAvance] = useState<string | null>(null);
  async function descargar() {
    const contenido: Record<string, Uint8Array> = {};
    for (const x of extras) contenido[x.ruta] = strToU8(x.texto);
    let fallas = 0;
    for (const [i, a] of archivos.entries()) {
      setAvance(`${i + 1}/${archivos.length}`);
      try {
        const r = await fetch(`/api/expedientes/${a.id}`);
        if (!r.ok) throw new Error(String(r.status));
        let ruta = a.ruta, k = 2;
        while (contenido[ruta]) ruta = a.ruta.replace(/(\.[^./]+)?$/, ` (${k++})$1`);
        contenido[ruta] = new Uint8Array(await r.arrayBuffer());
      } catch { fallas++; }
    }
    setAvance(null);
    descargarArchivo(`${nombre}.zip`, new Blob([zipSync(contenido, { level: 0 }) as Uint8Array<ArrayBuffer>], { type: "application/zip" }));
    avisar(fallas ? `ZIP descargado, pero ${fallas} ${fallas === 1 ? "archivo no se pudo bajar" : "archivos no se pudieron bajar"}.` : "Expediente descargado", fallas ? "error" : "ok");
  }
  return (
    <Boton variante="secundario" tamano="sm" icono={avance ? Loader2 : FolderDown} disabled={!!avance} onClick={descargar} className={avance ? "[&_svg]:animate-spin" : undefined}>
      {avance ? `Bajando ${avance}` : "Descargar ZIP"}
    </Boton>
  );
}
