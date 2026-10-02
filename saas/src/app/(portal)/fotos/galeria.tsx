"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, ImagePlus, Images, Search, Send, Trash2 } from "lucide-react";
import { Boton, Pastilla, Tarjeta, cx } from "@/components/ui";
import { descargarArchivo, useAviso } from "@/components/cliente";
import { dinero } from "@/lib/dominio/formato";
import { POSICIONES, nombreFoto } from "@/lib/fotos";
import { guardarFoto, quitarFoto } from "./acciones";

/** `fotos`: subidas en el portal (posición → versión). `incluidas`: fotos de fábrica (posición → id del archivo en /modelos). */
export type ModeloGaleria = { id: string; clave: string; nombre: string; precio: number; bono: number; fotos: Record<number, number>; incluidas: Partial<Record<number, string>> };

/** De dónde sale cada foto: la subida en el portal manda; si no hay, la de fábrica. */
function fuente(m: ModeloGaleria, n: number) {
  if (m.fotos[n]) {
    const base = `/api/fotos/${m.id}/${n}?v=${m.fotos[n]}`;
    return { grande: base, mini: `${base}&t=mini`, descarga: `${base}&descargar=1`, propia: true };
  }
  const id = m.incluidas[n];
  if (!id) return null;
  return { grande: `/modelos/${id}.jpg`, mini: `/modelos/${id}-mini.jpg`, descarga: `/modelos/${id}.jpg`, propia: false };
}

/** Reduce la imagen en el navegador: JPEG del lado largo indicado, en base64 sin encabezado. */
async function comprimir(archivo: File, lado: number, calidad: number) {
  const img = await createImageBitmap(archivo);
  const k = Math.min(1, lado / Math.max(img.width, img.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(img.width * k); lienzo.height = Math.round(img.height * k);
  const ctx = lienzo.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
  const datos = lienzo.toDataURL("image/jpeg", calidad).split(",")[1];
  return { datos, ancho: lienzo.width, alto: lienzo.height };
}

export function Galeria({ modelos, editar }: { modelos: ModeloGaleria[]; editar: boolean }) {
  const [buscar, setBuscar] = useState("");
  const q = buscar.trim().toLowerCase();
  const visibles = modelos.filter((m) => !q || m.nombre.toLowerCase().includes(q));
  return (
    <>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input className="campo pl-10" placeholder="Buscar modelo (King, Song, Seal…)" value={buscar} onChange={(e) => setBuscar(e.target.value)} aria-label="Buscar modelo" />
      </label>
      <div className="escalonado grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-2">
        {visibles.map((m) => <TarjetaModelo key={m.id} m={m} editar={editar} />)}
      </div>
      {!visibles.length ? <p className="text-center text-muted">No hay modelos con ese nombre.</p> : null}
    </>
  );
}

function TarjetaModelo({ m, editar }: { m: ModeloGaleria; editar: boolean }) {
  const avisar = useAviso();
  const [enviando, setEnviando] = useState(false);
  const hay = POSICIONES.filter((p) => fuente(m, p.n));

  async function enviar() {
    if (!hay.length) return;
    setEnviando(true);
    try {
      const archivos = await Promise.all(hay.map(async (p) => {
        const r = await fetch(fuente(m, p.n)!.grande);
        if (!r.ok) throw new Error("No se pudo bajar una foto.");
        return new File([await r.blob()], nombreFoto(m.nombre, p.n), { type: "image/jpeg" });
      }));
      if (navigator.canShare?.({ files: archivos })) {
        await navigator.share({ files: archivos, title: m.nombre, text: `BYD ${m.nombre}` }).catch((e) => { if (e?.name !== "AbortError") throw e; });
      } else {
        for (const a of archivos) { descargarArchivo(a.name, a); await new Promise((ok) => setTimeout(ok, 250)); }
        avisar(`${archivos.length} fotos descargadas`);
      }
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudieron enviar las fotos.", "error");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tarjeta id={m.clave} className="scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[1.6rem] font-semibold leading-none">{m.nombre}</h2>
          <p className="mt-1 text-[0.82rem] text-muted">{dinero(m.precio)}{m.bono ? ` · bono ${dinero(m.bono)}` : ""}</p>
        </div>
        {hay.length ? <Boton icono={Send} onClick={enviar} disabled={enviando} className="max-sm:w-full">{enviando ? "Preparando…" : `Enviar al cliente (${hay.length})`}</Boton>
          : <Pastilla>{editar ? "Sube las fotos" : "Sin fotos todavía"}</Pastilla>}
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {POSICIONES.map((p) => <Casilla key={p.n} m={m} n={p.n} etiqueta={p.etiqueta} editar={editar} />)}
      </div>
    </Tarjeta>
  );
}

function Casilla({ m, n, etiqueta, editar }: { m: ModeloGaleria; n: number; etiqueta: string; editar: boolean }) {
  const router = useRouter();
  const avisar = useAviso();
  const entrada = useRef<HTMLInputElement>(null);
  const [ocupado, iniciar] = useTransition();
  const f = fuente(m, n);

  function subir(archivo: File | undefined) {
    if (!archivo) return;
    iniciar(async () => {
      try {
        const [grande, mini] = await Promise.all([comprimir(archivo, 1600, 0.85), comprimir(archivo, 480, 0.75)]);
        const r = await guardarFoto({ modeloId: m.id, posicion: n, datos: grande.datos, miniatura: mini.datos, ancho: grande.ancho, alto: grande.alto });
        if (!r.ok) { avisar(r.error, "error"); return; }
        avisar(`${etiqueta} de ${m.nombre} guardada`);
        router.refresh();
      } catch {
        avisar("No se pudo leer esa imagen. Usa JPG o PNG.", "error");
      }
    });
  }

  return (
    <figure className="m-0 grid gap-1.5">
      <div className={cx("group relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-surface-2", ocupado && "animate-pulse")}>
        {f ? (
          // eslint-disable-next-line @next/next/no-img-element -- imagen privada servida por la API con la sesión
          <img src={f.mini} alt={`${m.nombre}, ${etiqueta.toLowerCase()}`} loading="lazy" decoding="async"
            className="size-full object-cover transition duration-300 group-hover:scale-[1.04]" />
        ) : (
          <button type="button" disabled={!editar} onClick={() => entrada.current?.click()}
            className={cx("grid size-full place-items-center text-muted", editar && "hover:bg-accent-soft hover:text-accent")}>
            <span className="grid justify-items-center gap-1 text-[0.76rem] font-semibold">
              {editar ? <ImagePlus className="size-6" aria-hidden /> : <Images className="size-6 opacity-50" aria-hidden />}
              {editar ? "Subir foto" : "Sin foto"}
            </span>
          </button>
        )}
        {f ? (
          <div className="absolute inset-x-1.5 bottom-1.5 flex justify-end gap-1.5">
            <a href={f.descarga} download={nombreFoto(m.nombre, n)} aria-label={`Descargar ${etiqueta}`} title="Descargar"
              className="grid size-9 place-items-center rounded-lg bg-surface/90 text-fg shadow-sm backdrop-blur transition hover:bg-surface active:scale-95"><Download className="size-4" /></a>
            {editar ? <>
              <button type="button" onClick={() => entrada.current?.click()} aria-label={`Cambiar ${etiqueta}`} title="Cambiar"
                className="grid size-9 place-items-center rounded-lg bg-surface/90 text-fg shadow-sm backdrop-blur transition hover:bg-surface active:scale-95"><ImagePlus className="size-4" /></button>
              {f.propia ? <button type="button" aria-label={`Quitar ${etiqueta}`} title="Quitar la foto subida"
                onClick={() => iniciar(async () => { const r = await quitarFoto(m.id, n); if (!r.ok) avisar(r.error, "error"); else router.refresh(); })}
                className="grid size-9 place-items-center rounded-lg bg-surface/90 text-bad shadow-sm backdrop-blur transition hover:bg-surface active:scale-95"><Trash2 className="size-4" /></button> : null}
            </> : null}
          </div>
        ) : null}
      </div>
      <figcaption className="text-[0.76rem] font-medium text-muted">{etiqueta}</figcaption>
      {editar ? <input ref={entrada} type="file" accept="image/*" className="hidden" onChange={(e) => { subir(e.target.files?.[0]); e.target.value = ""; }} /> : null}
    </figure>
  );
}
