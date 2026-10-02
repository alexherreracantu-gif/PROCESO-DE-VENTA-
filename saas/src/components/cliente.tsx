"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { X, Copy, Check } from "lucide-react";
import { Boton, cx } from "@/components/ui";

/* ---------------- Avisos flotantes ---------------- */
const ContextoAviso = createContext<(texto: string, tono?: "ok" | "error") => void>(() => {});
export const useAviso = () => useContext(ContextoAviso);

export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<{ texto: string; tono: "ok" | "error"; id: number } | null>(null);
  const mostrar = useCallback((texto: string, tono: "ok" | "error" = "ok") => setAviso({ texto, tono, id: Date.now() }), []);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), aviso.tono === "error" ? 5000 : 2600);
    return () => clearTimeout(t);
  }, [aviso]);
  return (
    <ContextoAviso.Provider value={mostrar}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[max(16px,env(safe-area-inset-bottom))] z-[80] flex justify-center px-4">
        {aviso ? (
          <div key={aviso.id} className={cx("max-w-full rounded-xl px-4 py-2.5 text-[0.88rem] font-semibold shadow-card", aviso.tono === "error" ? "bg-bad text-white" : "bg-ink text-on-ink")}>
            {aviso.texto}
          </div>
        ) : null}
      </div>
    </ContextoAviso.Provider>
  );
}

/* ---------------- Diálogo ---------------- */
export function Dialogo({ abierto, alCerrar, titulo, subtitulo, children, pie, ancho = "md" }: {
  abierto: boolean; alCerrar: () => void; titulo: ReactNode; subtitulo?: ReactNode; children: ReactNode; pie?: ReactNode; ancho?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);
  return (
    <dialog ref={ref} onClose={alCerrar} onCancel={(e) => { e.preventDefault(); alCerrar(); }}
      className={cx("m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] overflow-hidden rounded-2xl border border-line bg-surface p-0 text-fg shadow-2xl", { sm: "max-w-[440px]", md: "max-w-[720px]", lg: "max-w-[960px]" }[ancho])}>
      {abierto ? (
        <div className="flex max-h-[calc(100dvh-34px)] flex-col">
          <div className="flex items-start gap-3 px-5 pt-5">
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[1.7rem] font-semibold leading-tight">{titulo}</h2>
              {subtitulo ? <p className="mt-0.5 text-sm text-muted">{subtitulo}</p> : null}
            </div>
            <button type="button" onClick={alCerrar} aria-label="Cerrar" className="grid size-9 place-items-center rounded-lg border border-line text-muted hover:bg-surface-2 hover:text-fg">
              <X className="size-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {pie ? <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface px-5 py-3.5">{pie}</div> : null}
        </div>
      ) : null}
    </dialog>
  );
}

export function Confirmar({ abierto, alCerrar, titulo, texto, boton, alConfirmar, ocupado }: {
  abierto: boolean; alCerrar: () => void; titulo: string; texto: string; boton: string; alConfirmar: () => void; ocupado?: boolean;
}) {
  return (
    <Dialogo abierto={abierto} alCerrar={alCerrar} titulo={titulo} ancho="sm"
      pie={<><Boton variante="peligro" onClick={alConfirmar} disabled={ocupado}>{boton}</Boton><Boton variante="secundario" onClick={alCerrar}>Cancelar</Boton></>}>
      <p className="text-muted">{texto}</p>
    </Dialogo>
  );
}

/* ---------------- Copiar ---------------- */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = texto; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.append(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

export function BotonCopiar({ texto, etiqueta = "Copiar", mensaje = "Copiado", variante = "secundario", tamano = "sm" }: { texto: string; etiqueta?: string; mensaje?: string; variante?: "primario" | "secundario"; tamano?: "sm" | "md" }) {
  const avisar = useAviso();
  const [hecho, setHecho] = useState(false);
  return (
    <Boton variante={variante} tamano={tamano} icono={hecho ? Check : Copy} onClick={async () => {
      const ok = await copiarTexto(texto);
      avisar(ok ? mensaje : "No se pudo copiar. Selecciona el texto y cópialo a mano.", ok ? "ok" : "error");
      if (ok) { setHecho(true); setTimeout(() => setHecho(false), 1500); }
    }}>{etiqueta}</Boton>
  );
}

/** Descarga un archivo generado en el navegador. */
export function descargarArchivo(nombre: string, datos: Blob) {
  const url = URL.createObjectURL(datos);
  const a = document.createElement("a");
  a.href = url; a.download = nombre;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
