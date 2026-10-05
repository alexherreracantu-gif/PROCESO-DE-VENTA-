"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Share2, Trash2, Upload, X } from "lucide-react";
import { Boton, Campo, Tarjeta, TituloTarjeta } from "@/components/ui";
import { Confirmar, descargarArchivo, useAviso } from "@/components/cliente";
import { quitarAnuncioOficial, subirAnuncioOficial } from "./oficiales-acciones";

export type Pieza = { id: string; titulo: string; grande: string; mini: string; clave: string | null; propia: boolean };

/** JPEG del lado largo indicado, en base64 sin encabezado (sin agrandar). */
async function comprimir(archivo: File, lado: number, calidad: number) {
  const img = await createImageBitmap(archivo);
  const k = Math.min(1, lado / Math.max(img.width, img.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(img.width * k); lienzo.height = Math.round(img.height * k);
  const ctx = lienzo.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
  return lienzo.toDataURL("image/jpeg", calidad).split(",")[1];
}

const nombreArchivo = (t: string) => `${t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "anuncio"}.jpg`;

export function AnunciosOficiales({ piezas, mes, mesTexto, direccion, modelos }: {
  piezas: Pieza[]; mes: string; mesTexto: string; direccion: boolean; modelos: { id: string; clave: string; nombre: string }[];
}) {
  const router = useRouter();
  const avisar = useAviso();
  const [abierta, setAbierta] = useState<Pieza | null>(null);
  const [quitar, setQuitar] = useState<Pieza | null>(null);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [modeloSubir, setModeloSubir] = useState("");
  const [ocupado, iniciar] = useTransition();
  const ref = useRef<HTMLInputElement>(null);
  const visibles = piezas;

  async function compartir(p: Pieza) {
    try {
      const blob = await (await fetch(p.grande)).blob();
      const file = new File([blob], nombreArchivo(p.titulo), { type: "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
      else { descargarArchivo(file.name, blob); avisar("Este navegador no comparte imágenes: se descargó para que la mandes."); }
    } catch (e) {
      if ((e as { name?: string })?.name !== "AbortError") avisar("No se pudo compartir.", "error");
    }
  }

  async function subir(lista: FileList | null) {
    const archivos = [...(lista ?? [])].filter((a) => a.type.startsWith("image/"));
    let bien = 0;
    for (const [i, a] of archivos.entries()) {
      setSubiendo(archivos.length > 1 ? `${i + 1}/${archivos.length}` : "…");
      try {
        const [datos, miniatura] = await Promise.all([comprimir(a, 1920, 0.9), comprimir(a, 480, 0.8)]);
        const modelo = modelos.find((m) => m.id === modeloSubir);
        const titulo = (modelo ? `${modelo.nombre} · ` : "") + a.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").slice(0, 60);
        const r = await subirAnuncioOficial({ mes, modeloId: modeloSubir || null, titulo, datos, miniatura });
        if (r.ok) bien++; else avisar(r.error, "error");
      } catch { avisar(`No se pudo leer ${a.name}.`, "error"); }
    }
    setSubiendo(null);
    if (ref.current) ref.current.value = "";
    if (bien) { avisar(bien === 1 ? "Anuncio agregado" : `${bien} anuncios agregados`); router.refresh(); }
  }

  return (
    <Tarjeta>
      <TituloTarjeta titulo={`Anuncios oficiales de ${mesTexto}`} nota={`${piezas.length} ${piezas.length === 1 ? "pieza" : "piezas"} de la campaña · listas para publicar`} />
      {visibles.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {visibles.map((p) => (
            <li key={p.id} className="group grid content-start gap-1.5">
              <button type="button" onClick={() => setAbierta(p)} className="relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-2 transition hover:-translate-y-0.5 hover:shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element -- miniatura del anuncio */}
                <img src={p.mini} alt={p.titulo} loading="lazy" className="size-full object-cover" />
              </button>
              <p className="line-clamp-2 text-[0.76rem] font-medium leading-snug">{p.titulo}</p>
              <div className="flex gap-1">
                <a href={p.grande} download={nombreArchivo(p.titulo)} aria-label={`Descargar ${p.titulo}`} className="grid h-8 flex-1 place-items-center rounded-lg border border-line text-muted hover:bg-surface-2 hover:text-fg"><Download className="size-4" /></a>
                <button type="button" onClick={() => compartir(p)} aria-label={`Compartir ${p.titulo}`} className="grid h-8 flex-1 place-items-center rounded-lg bg-wa text-white hover:brightness-110"><Share2 className="size-4" /></button>
                {p.propia && direccion ? <button type="button" onClick={() => setQuitar(p)} aria-label={`Quitar ${p.titulo}`} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-bad-soft hover:text-bad"><Trash2 className="size-4" /></button> : null}
              </div>
              {p.clave ? <a href={`/anuncios?modelo=${p.clave}#generador`} className="text-[0.74rem] font-semibold text-accent hover:underline">Hacer uno con mis datos →</a> : null}
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted">{direccion ? "Sube aquí las piezas que manda mercadotecnia para que todo el equipo las publique." : "Todavía no hay anuncios oficiales este mes."}</p>}

      {direccion ? (
        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
          <Campo etiqueta="Modelo del anuncio (opcional)" htmlFor="of-modelo" className="w-56">
            <select id="of-modelo" className="campo" value={modeloSubir} onChange={(e) => setModeloSubir(e.target.value)}>
              <option value="">General (varios modelos)</option>
              {modelos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </Campo>
          <input ref={ref} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} onChange={(e) => subir(e.target.files)} />
          <Boton variante="secundario" icono={subiendo ? Loader2 : Upload} disabled={!!subiendo} onClick={() => ref.current?.click()} className={subiendo ? "[&_svg]:animate-spin" : undefined}>
            {subiendo ? `Subiendo ${subiendo}` : "Subir anuncios oficiales"}
          </Boton>
        </div>
      ) : null}

      {abierta ? (
        <div role="dialog" aria-modal aria-label={abierta.titulo} className="aparece fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4" onClick={() => setAbierta(null)}>
          <div className="grid w-full max-w-[640px] gap-3" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- anuncio en grande */}
            <img src={abierta.grande} alt={abierta.titulo} className="max-h-[78dvh] w-full rounded-xl object-contain" />
            <div className="flex flex-wrap justify-center gap-2">
              <a href={abierta.grande} download={nombreArchivo(abierta.titulo)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[0.9rem] font-semibold text-fg"><Download className="size-4" />Descargar</a>
              <Boton variante="whatsapp" icono={Share2} onClick={() => compartir(abierta)}>Compartir</Boton>
              <Boton variante="secundario" icono={X} onClick={() => setAbierta(null)}>Cerrar</Boton>
            </div>
          </div>
        </div>
      ) : null}
      <Confirmar abierto={!!quitar} alCerrar={() => setQuitar(null)} titulo="¿Quitar este anuncio?" boton="Quitar" ocupado={ocupado}
        texto={`Se quita “${quitar?.titulo ?? ""}” de la galería para todo el equipo.`}
        alConfirmar={() => iniciar(async () => {
          const r = await quitarAnuncioOficial(quitar!.id);
          setQuitar(null);
          avisar(r.ok ? r.mensaje ?? "Listo" : r.error, r.ok ? "ok" : "error");
          if (r.ok) router.refresh();
        })} />
    </Tarjeta>
  );
}
