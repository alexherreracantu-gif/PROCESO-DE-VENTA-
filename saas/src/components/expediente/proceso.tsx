"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, ChevronDown, CircleDashed, Download, FileText, Hand, Link2, Loader2, MoreHorizontal, Upload, X } from "lucide-react";
import { Boton, Campo, cx, Pastilla, Progreso } from "@/components/ui";
import { Confirmar, Dialogo, useAviso } from "@/components/cliente";
import { agregarEnlace, guardarCredito, marcarRequisito, quitarDocumento } from "@/app/(portal)/ventas/expediente";
import { BANCOS, type DatosCredito } from "@/lib/dominio/cuenta";
import { fechaCorta } from "@/lib/dominio/fechas";
import { dinero } from "@/lib/dominio/formato";
import type { DocumentoResumen, EtapaEvaluada, RequisitoEvaluado, ResultadoProceso } from "@/lib/dominio/proceso";
import { pesoArchivo, subirArchivo } from "./subir";

type Props = {
  ventaId: string;
  proceso: ResultadoProceso;
  documentos: DocumentoResumen[];
  credito: DatosCredito | null;
  direccion: boolean;
};

/** Archivo del expediente: abre en otra pestaña; la X lo quita. */
export function ChipArchivo({ doc, alQuitar }: { doc: DocumentoResumen; alQuitar?: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-lg border border-line bg-surface py-0.5 pl-2 pr-0.5 text-[0.78rem]">
      {doc.enlace ? <Link2 className="size-3.5 shrink-0 text-accent" aria-hidden /> : <FileText className="size-3.5 shrink-0 text-accent" aria-hidden />}
      <a href={`/api/expedientes/${doc.id}`} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate font-medium hover:underline" title={doc.nombre}>{doc.nombre}</a>
      {doc.tamano ? <span className="shrink-0 text-subtle">{pesoArchivo(doc.tamano)}</span> : null}
      {!doc.enlace ? (
        <a href={`/api/expedientes/${doc.id}?descargar=1`} aria-label={`Descargar ${doc.nombre}`} className="grid size-6 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-fg"><Download className="size-3.5" /></a>
      ) : null}
      {alQuitar ? (
        <button type="button" onClick={alQuitar} aria-label={`Quitar ${doc.nombre}`} className="grid size-6 shrink-0 place-items-center rounded-md text-muted hover:bg-bad-soft hover:text-bad"><X className="size-3.5" /></button>
      ) : null}
    </span>
  );
}

/** Botón para subir uno o varios archivos a un requisito (o al recibo de un pago). */
export function BotonSubir({ ventaId, tipo, movimientoId, varios, texto = "Subir", tamano = "sm", variante = "secundario" }: {
  ventaId: string; tipo: string; movimientoId?: string | null; varios?: boolean; texto?: string; tamano?: "sm" | "md"; variante?: "secundario" | "primario" | "fantasma";
}) {
  const router = useRouter();
  const avisar = useAviso();
  const ref = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  async function subir(lista: FileList | null) {
    const archivos = [...(lista ?? [])];
    if (!archivos.length) return;
    let bien = 0;
    for (const [i, a] of archivos.entries()) {
      setSubiendo(archivos.length > 1 ? `${i + 1}/${archivos.length}` : "…");
      const r = await subirArchivo(ventaId, tipo, a, movimientoId);
      if (r.ok) bien++; else avisar(r.error, "error");
    }
    setSubiendo(null);
    if (ref.current) ref.current.value = "";
    if (bien) { avisar(bien === 1 ? "Archivo guardado" : `${bien} archivos guardados`); router.refresh(); }
  }
  return (
    <>
      <input ref={ref} type="file" className="sr-only" tabIndex={-1} multiple={varios} onChange={(e) => subir(e.target.files)}
        accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.xml,.xlsx,.xls,.docx,.doc,.csv,image/*,application/pdf" />
      <Boton variante={variante} tamano={tamano} icono={subiendo ? Loader2 : Upload} disabled={!!subiendo} onClick={() => ref.current?.click()}
        className={subiendo ? "[&_svg]:animate-spin" : undefined}>
        {subiendo ? `Subiendo ${subiendo}` : texto}
      </Boton>
    </>
  );
}

function FormEnlace({ ventaId, tipo, movimientoId, alCerrar }: { ventaId: string; tipo: string; movimientoId?: string | null; alCerrar: () => void }) {
  const router = useRouter();
  const avisar = useAviso();
  const [enlace, setEnlace] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();
  const guardar = () => iniciar(async () => {
    const r = await agregarEnlace({ ventaId, tipo, movimientoId, enlace, nombre });
    if (!r.ok) { setError(r.error); return; }
    avisar(r.mensaje ?? "Guardado");
    alCerrar();
    router.refresh();
  });
  return (
    <Dialogo abierto alCerrar={alCerrar} titulo="Pegar enlace" subtitulo="Para lo que ya tienes en Google Drive: compártelo como “Cualquier persona con el enlace”." ancho="sm"
      pie={<><Boton onClick={guardar} disabled={ocupado || !enlace.trim()}>{ocupado ? "Guardando…" : "Guardar enlace"}</Boton><Boton variante="secundario" onClick={alCerrar}>Cancelar</Boton></>}>
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
        <Campo etiqueta="Enlace" htmlFor="enl-url" error={error}>
          <input id="enl-url" className="campo" inputMode="url" placeholder="https://drive.google.com/…" value={enlace} onChange={(e) => setEnlace(e.target.value)} autoFocus />
        </Campo>
        <Campo etiqueta="Nombre (opcional)" htmlFor="enl-nombre" ayuda="Ej. Factura AN5B9 2364">
          <input id="enl-nombre" className="campo" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={200} />
        </Campo>
      </form>
    </Dialogo>
  );
}

function IconoEstado({ r, numero }: { r: RequisitoEvaluado; numero?: number }) {
  if (r.estado === "hecho") return <span className="salta grid size-7 shrink-0 place-items-center rounded-full bg-ok text-white"><Check className="size-4" strokeWidth={3} /></span>;
  if (r.estado === "na") return <span className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-dashed border-line text-subtle"><Ban className="size-3.5" /></span>;
  return <span className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-line text-[0.72rem] font-bold text-muted">{numero ?? <CircleDashed className="size-3.5" />}</span>;
}

function FilaRequisito({ r, docs, ventaId, direccion, listoParaSalida, siguiente, pendientesSalida }: {
  r: RequisitoEvaluado; docs: DocumentoResumen[]; ventaId: string; direccion: boolean; listoParaSalida: boolean; siguiente: boolean; pendientesSalida: string[];
}) {
  const router = useRouter();
  const avisar = useAviso();
  const [menu, setMenu] = useState(false);
  const [enlace, setEnlace] = useState(false);
  const [quitar, setQuitar] = useState<DocumentoResumen | null>(null);
  const [forzar, setForzar] = useState(false);
  const [ocupado, iniciar] = useTransition();

  const marcar = (estado: "hecho" | "na" | null, forzado = false) => iniciar(async () => {
    setMenu(false);
    const res = await marcarRequisito(ventaId, r.id, estado, forzado);
    if (!res.ok) { avisar(res.error, "error"); return; }
    if (res.mensaje) avisar(res.mensaje);
    setForzar(false);
    router.refresh();
  });

  const esEntrega = r.id === "entrega";
  const bloqueada = esEntrega && r.estado !== "hecho" && !listoParaSalida;

  let acciones: ReactNode = null;
  if (r.tipo === "auto") {
    acciones = <a href="#cuenta" className="text-[0.8rem] font-semibold text-accent hover:underline">Ver cuenta</a>;
  } else if (r.estado === "na") {
    acciones = <Boton variante="fantasma" tamano="sm" disabled={ocupado} onClick={() => marcar(null)}>Sí aplica</Boton>;
  } else if (r.tipo === "doc") {
    acciones = (
      <>
        <BotonSubir ventaId={ventaId} tipo={r.id} varios={r.varios} texto={docs.length ? "Agregar" : "Subir"} variante={siguiente && !docs.length ? "primario" : "secundario"} />
        <span className="relative">
          <Boton variante="fantasma" tamano="sm" aria-label="Más opciones" aria-expanded={menu} onClick={() => setMenu(!menu)}><MoreHorizontal className="size-4" /></Boton>
          {menu ? (
            <span className="aparece absolute right-0 top-9 z-10 grid w-56 gap-0.5 rounded-xl border border-line bg-surface p-1.5 shadow-xl" onMouseLeave={() => setMenu(false)}>
              <button type="button" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[0.84rem] hover:bg-surface-2" onClick={() => { setMenu(false); setEnlace(true); }}><Link2 className="size-4 text-muted" />Pegar enlace de Drive</button>
              {r.marcado
                ? <button type="button" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[0.84rem] hover:bg-surface-2" onClick={() => marcar(null)}><X className="size-4 text-muted" />Quitar “en físico”</button>
                : <button type="button" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[0.84rem] hover:bg-surface-2" onClick={() => marcar("hecho")}><Hand className="size-4 text-muted" />Lo tengo en físico</button>}
              <button type="button" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[0.84rem] hover:bg-surface-2" onClick={() => marcar("na")}><Ban className="size-4 text-muted" />No aplica a esta venta</button>
            </span>
          ) : null}
        </span>
      </>
    );
  } else {
    acciones = r.estado === "hecho" ? (
      <Boton variante="fantasma" tamano="sm" disabled={ocupado} onClick={() => marcar(null)}>Desmarcar</Boton>
    ) : (
      <>
        <Boton variante={siguiente || (esEntrega && listoParaSalida) ? "primario" : "secundario"} tamano="sm" icono={Check} disabled={ocupado || (bloqueada && !direccion)}
          onClick={() => (bloqueada ? setForzar(true) : marcar("hecho"))} title={bloqueada ? "Completa los pendientes para entregar" : undefined}>
          {esEntrega ? "Entregar" : "Hecho"}
        </Boton>
        {!esEntrega ? <Boton variante="fantasma" tamano="sm" disabled={ocupado} onClick={() => marcar("na")}>No aplica</Boton> : null}
      </>
    );
  }

  return (
    <li className={cx("grid gap-2 rounded-xl px-2.5 py-2.5 transition sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center", siguiente && "bg-accent-soft/70")}>
      <div className="flex min-w-0 items-start gap-3">
        <IconoEstado r={r} />
        <div className="min-w-0 flex-1">
          <p className={cx("text-[0.9rem] font-semibold leading-snug", r.estado === "na" && "text-muted line-through decoration-1")}>
            {r.label}
            {r.tipo === "auto" ? <Pastilla className="ml-2 align-[1px]" tono={r.estado === "hecho" ? "ok" : "warn"}>Automático</Pastilla> : null}
          </p>
          <p className={cx("text-[0.78rem]", r.estado === "pendiente" && r.tipo === "auto" ? "font-semibold text-warn" : "text-muted")}>
            {r.estado === "hecho" && r.tipo === "paso" && r.fecha ? `Hecho el ${fechaCorta(r.fecha)}` : r.detalle && r.estado !== "pendiente" ? r.detalle : r.detalle ?? r.ayuda}
            {r.estado === "hecho" && r.tipo === "doc" && r.marcado && !docs.length && r.fecha ? ` · ${fechaCorta(r.fecha)}` : ""}
          </p>
          {bloqueada ? <p className="mt-0.5 text-[0.76rem] font-semibold text-bad">Falta: {pendientesSalida.slice(0, 3).join(", ")}{pendientesSalida.length > 3 ? ` y ${pendientesSalida.length - 3} más` : ""}</p> : null}
          {docs.length ? <div className="mt-1.5 flex flex-wrap gap-1.5">{docs.map((d) => <ChipArchivo key={d.id} doc={d} alQuitar={() => setQuitar(d)} />)}</div> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1.5 max-sm:pl-10">{acciones}</div>
      {enlace ? <FormEnlace ventaId={ventaId} tipo={r.id} alCerrar={() => setEnlace(false)} /> : null}
      <Confirmar abierto={!!quitar} alCerrar={() => setQuitar(null)} titulo="¿Quitar este archivo?" boton="Quitar" ocupado={ocupado}
        texto={`Se quita “${quitar?.nombre ?? ""}” del expediente${quitar?.enlace ? "" : " y se borra del almacenamiento"}.`}
        alConfirmar={() => iniciar(async () => {
          const res = await quitarDocumento(quitar!.id);
          setQuitar(null);
          if (!res.ok) { avisar(res.error, "error"); return; }
          avisar(res.mensaje ?? "Quitado");
          router.refresh();
        })} />
      <Confirmar abierto={forzar} alCerrar={() => setForzar(false)} titulo="¿Entregar con pendientes?" boton="Entregar de todos modos" ocupado={ocupado}
        texto={`El expediente no está al 100%. Falta: ${pendientesSalida.join(", ")}. Como dirección puedes autorizar la entrega; queda en el historial.`}
        alConfirmar={() => marcar("hecho", true)} />
    </li>
  );
}

function FormCredito({ ventaId, credito }: { ventaId: string; credito: DatosCredito | null }) {
  const router = useRouter();
  const avisar = useAviso();
  const [ocupado, iniciar] = useTransition();
  const c = credito ?? {};
  const [f, setF] = useState({
    banco: c.banco ?? "", monto: c.monto != null ? String(c.monto) : "", enganche: c.enganche != null ? String(c.enganche) : "",
    plazo: c.plazo != null ? String(c.plazo) : "", tasa: c.tasa != null ? String(c.tasa) : "", fecha: c.fecha ?? "",
  });
  const num = (v: string) => (v.trim() === "" ? null : Number(v));
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <form className="mt-3 grid gap-3 rounded-xl border border-line bg-surface-2/60 p-3.5 sm:grid-cols-3 lg:grid-cols-6"
      onSubmit={(e) => { e.preventDefault(); iniciar(async () => {
        const r = await guardarCredito(ventaId, { banco: f.banco, monto: num(f.monto), enganche: num(f.enganche), plazo: num(f.plazo), tasa: num(f.tasa), fecha: f.fecha });
        avisar(r.ok ? r.mensaje ?? "Guardado" : r.error, r.ok ? "ok" : "error");
        if (r.ok) router.refresh();
      }); }}>
      <p className="text-[0.8rem] font-semibold sm:col-span-3 lg:col-span-6">Datos de la carta de aprobación</p>
      <Campo etiqueta="Banco" htmlFor="cr-banco"><select id="cr-banco" className="campo" value={f.banco} onChange={set("banco")}><option value="">—</option>{BANCOS.map((b) => <option key={b}>{b}</option>)}</select></Campo>
      <Campo etiqueta="Monto financiado" htmlFor="cr-monto"><input id="cr-monto" type="number" min={0} step="0.01" inputMode="decimal" className="campo" value={f.monto} onChange={set("monto")} /></Campo>
      <Campo etiqueta="Enganche" htmlFor="cr-eng"><input id="cr-eng" type="number" min={0} step="0.01" inputMode="decimal" className="campo" value={f.enganche} onChange={set("enganche")} /></Campo>
      <Campo etiqueta="Plazo (meses)" htmlFor="cr-plazo"><input id="cr-plazo" type="number" min={6} max={96} step={1} inputMode="numeric" className="campo" value={f.plazo} onChange={set("plazo")} /></Campo>
      <Campo etiqueta="Tasa anual %" htmlFor="cr-tasa"><input id="cr-tasa" type="number" min={0} max={60} step="0.01" inputMode="decimal" className="campo" value={f.tasa} onChange={set("tasa")} /></Campo>
      <Campo etiqueta="Fecha de aprobación" htmlFor="cr-fecha"><input id="cr-fecha" type="date" className="campo" value={f.fecha} onChange={set("fecha")} /></Campo>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3 lg:col-span-6">
        <Boton type="submit" tamano="sm" disabled={ocupado}>{ocupado ? "Guardando…" : "Guardar crédito"}</Boton>
        {c.monto ? <span className="text-[0.8rem] text-muted">{c.banco ?? "Banco"} · {dinero(c.monto)} a {c.plazo ?? "—"} meses{c.tasa != null ? ` · ${c.tasa}%` : ""}</span> : null}
      </div>
    </form>
  );
}

function SeccionEtapa({ etapa, numero, abierta, alternar, children }: { etapa: EtapaEvaluada; numero: number; abierta: boolean; alternar: () => void; children: ReactNode }) {
  return (
    <section className={cx("rounded-2xl border transition", etapa.completa ? "border-ok/30 bg-ok-soft/30" : "border-line bg-surface")}>
      <button type="button" onClick={alternar} aria-expanded={abierta} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className={cx("grid size-8 shrink-0 place-items-center rounded-full font-display text-[1.05rem] font-semibold", etapa.completa ? "bg-ok text-white" : "bg-accent-soft text-accent")}>
          {etapa.completa ? <Check className="size-4" strokeWidth={3} /> : numero}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{etapa.label}</span>
          <span className="mt-1 flex items-center gap-2"><Progreso valor={etapa.total ? etapa.hechos / etapa.total : 1} className="h-1.5 max-w-[180px] flex-1" /><span className="text-[0.76rem] tabular-nums text-muted">{etapa.hechos}/{etapa.total}</span></span>
        </span>
        <ChevronDown className={cx("size-5 shrink-0 text-muted transition-transform", abierta && "rotate-180")} />
      </button>
      {abierta ? <div className="aparece border-t border-line/70 px-1.5 pb-2 pt-1 sm:px-2.5">{children}</div> : null}
    </section>
  );
}

export function ProcesoVenta({ ventaId, proceso, documentos, credito, direccion }: Props) {
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(proceso.etapas.map((e) => [e.id, !e.completa])));
  const pendientesSalida = proceso.pendientes.filter((p) => p.id !== "entrega").map((p) => p.label);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {proceso.etapas.map((et, i) => (
        <SeccionEtapa key={et.id} etapa={et} numero={i + 1} abierta={abiertas[et.id] ?? true} alternar={() => setAbiertas({ ...abiertas, [et.id]: !(abiertas[et.id] ?? true) })}>
          <ul className="grid grid-cols-[minmax(0,1fr)]">
            {et.requisitos.map((r) => (
              <FilaRequisito key={r.id} r={r} ventaId={ventaId} direccion={direccion} docs={documentos.filter((d) => d.tipo === r.id && !d.movimiento_id)}
                listoParaSalida={proceso.listoParaSalida} siguiente={proceso.siguiente?.id === r.id} pendientesSalida={pendientesSalida} />
            ))}
          </ul>
          {et.id === "credito" && et.requisitos.some((r) => r.id === "aprobacion") ? <div className="px-2.5 pb-1"><FormCredito ventaId={ventaId} credito={credito} /></div> : null}
        </SeccionEtapa>
      ))}
    </div>
  );
}

export { FormEnlace };
