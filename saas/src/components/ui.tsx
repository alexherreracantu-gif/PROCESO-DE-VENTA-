import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Cifra } from "@/components/cifra";

export const cx = clsx;

type Variante = "primario" | "tinta" | "secundario" | "fantasma" | "peligro" | "whatsapp" | "acento";
type Tamano = "sm" | "md" | "lg";
const VARIANTES: Record<Variante, string> = {
  primario: "bg-accent text-on-accent hover:brightness-110 border-transparent",
  tinta: "bg-ink text-on-ink hover:brightness-110 border-transparent",
  secundario: "bg-surface text-fg border-line hover:bg-surface-2",
  fantasma: "bg-transparent text-muted border-transparent hover:bg-surface-2 hover:text-fg",
  peligro: "bg-surface text-bad border-line hover:bg-bad-soft",
  whatsapp: "bg-wa text-white border-transparent hover:brightness-110",
  acento: "bg-accent text-on-accent border-transparent hover:brightness-110",
};
const TAMANOS: Record<Tamano, string> = {
  sm: "h-8 px-3 text-[0.82rem] rounded-lg gap-1.5",
  md: "h-10 px-4 text-[0.9rem] rounded-xl gap-2",
  lg: "h-12 px-5 text-base rounded-xl gap-2",
};
export function claseBoton(variante: Variante = "primario", tamano: Tamano = "md", extra?: string) {
  return cx("inline-flex items-center justify-center whitespace-nowrap border font-semibold transition active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none", VARIANTES[variante], TAMANOS[tamano], extra);
}

type PropsBoton = { variante?: Variante; tamano?: Tamano; icono?: LucideIcon } & ComponentProps<"button">;
export function Boton({ variante, tamano, icono: Icono, className, children, type = "button", ...p }: PropsBoton) {
  return (
    <button type={type} className={claseBoton(variante, tamano, className)} {...p}>
      {Icono ? <Icono className="size-4 shrink-0" strokeWidth={2} aria-hidden /> : null}
      {children}
    </button>
  );
}

type PropsEnlace = { variante?: Variante; tamano?: Tamano; icono?: LucideIcon; href: string; externo?: boolean } & Omit<ComponentProps<"a">, "href">;
export function BotonEnlace({ variante, tamano, icono: Icono, className, children, href, externo, ...p }: PropsEnlace) {
  const clase = claseBoton(variante, tamano, className);
  const contenido = (
    <>
      {Icono ? <Icono className="size-4 shrink-0" strokeWidth={2} aria-hidden /> : null}
      {children}
    </>
  );
  if (externo) return <a href={href} target="_blank" rel="noopener noreferrer" className={clase} {...p}>{contenido}</a>;
  return <Link href={href} className={clase} {...p}>{contenido}</Link>;
}

export function Tarjeta({ className, ...p }: ComponentProps<"section">) {
  return <section className={cx("min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-card", className)} {...p} />;
}

export function TituloTarjeta({ titulo, children, nota }: { titulo: ReactNode; children?: ReactNode; nota?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
      <h2 className="min-w-0 flex-1 text-[0.98rem] font-semibold">{titulo}</h2>
      {nota ? <span className="text-xs text-muted max-sm:order-last max-sm:w-full">{nota}</span> : null}
      {children}
    </div>
  );
}

export type Tono = "neutro" | "acc" | "ok" | "warn" | "bad";
const TONOS: Record<Tono, string> = {
  neutro: "bg-surface-2 text-muted",
  acc: "bg-accent-soft text-accent",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
};
export function Pastilla({ tono = "neutro", children, className }: { tono?: Tono; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.72rem] font-semibold", TONOS[tono], className)}>{children}</span>;
}

export function Indicador({ etiqueta, valor, nota, tono }: { etiqueta: string; valor: ReactNode; nota?: ReactNode; tono?: "ok" | "warn" | "bad" }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-card">
      <span className="text-[0.8rem] font-medium text-muted">{etiqueta}</span>
      <span className={cx("num text-[2.35rem]", tono === "ok" && "text-ok", tono === "warn" && "text-warn", tono === "bad" && "text-bad")}>{typeof valor === "string" || typeof valor === "number" ? <Cifra key={String(valor)} valor={String(valor)} /> : valor}</span>
      {nota ? <span className="text-[0.8rem] text-muted">{nota}</span> : null}
    </div>
  );
}

export function Encabezado({ eyebrow, titulo, descripcion, children }: { eyebrow?: ReactNode; titulo: ReactNode; descripcion?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="min-w-0 flex-[1_1_320px]">
        {eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}
        <h1 className="font-display text-[2.5rem] font-semibold leading-none tracking-tight max-sm:text-[2.1rem]">{titulo}</h1>
        {descripcion ? <p className="mt-2 max-w-[68ch] text-[0.92rem] text-muted">{descripcion}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function Campo({ etiqueta, htmlFor, requerido, ayuda, error, children, className }: { etiqueta: ReactNode; htmlFor?: string; requerido?: boolean; ayuda?: ReactNode; error?: string | null; children: ReactNode; className?: string }) {
  return (
    <div className={cx("grid min-w-0 content-start gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[0.8rem] font-semibold text-muted">
        {etiqueta}
        {requerido ? <span className="text-bad"> *</span> : null}
      </label>
      {children}
      {error ? <span className="text-[0.78rem] font-semibold text-bad">{error}</span> : ayuda ? <span className="text-[0.78rem] text-muted">{ayuda}</span> : null}
    </div>
  );
}

export function Avatar({ texto, destacado, tamano = "md", sobreMarca }: { texto: string; destacado?: boolean; tamano?: "sm" | "md" | "lg" | "xl"; sobreMarca?: boolean }) {
  const t = { sm: "size-7 text-[0.7rem]", md: "size-9 text-[0.85rem]", lg: "size-11 text-base", xl: "size-20 text-3xl" }[tamano];
  return (
    <span className={cx("grid shrink-0 place-items-center rounded-full font-display font-semibold", t, sobreMarca ? "bg-white text-brand-deep" : destacado ? "bg-brand text-white" : "bg-surface-2 text-fg", texto.length > 2 && tamano !== "xl" && "text-[0.66rem] tracking-wide")} aria-hidden>
      {texto}
    </span>
  );
}

export function Vacio({ titulo, children, accion }: { titulo: string; children?: ReactNode; accion?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed border-line px-5 py-10 text-center text-muted">
      <strong className="text-fg">{titulo}</strong>
      {children ? <div className="max-w-[56ch] text-sm">{children}</div> : null}
      {accion}
    </div>
  );
}

export function Aviso({ tono = "acc", children }: { tono?: "acc" | "warn" | "bad" | "ok"; children: ReactNode }) {
  const t = { acc: "bg-accent-soft", warn: "bg-warn-soft", bad: "bg-bad-soft text-bad", ok: "bg-ok-soft" }[tono];
  return <div className={cx("rounded-xl px-4 py-3 text-[0.88rem]", t)}>{children}</div>;
}

/** Barra horizontal con meta opcional (línea vertical). */
export function FilaBarra({ etiqueta, valor, max, texto, meta, muestra, titulo }: { etiqueta: ReactNode; valor: number; max: number; texto: ReactNode; meta?: number | null; muestra?: string; titulo?: string }) {
  const ancho = max > 0 ? Math.min(valor / max, 1) * 100 : 0;
  return (
    <div className="grid grid-cols-[minmax(84px,150px)_minmax(0,1fr)_auto] items-center gap-3 text-[0.86rem] max-sm:grid-cols-[minmax(76px,104px)_minmax(0,1fr)_auto] max-sm:gap-2" title={titulo}>
      <span className="flex min-w-0 items-center gap-2">
        {muestra ? <span className="size-3.5 shrink-0 rounded-full border border-line" style={{ background: muestra }} /> : null}
        <span className="truncate">{etiqueta}</span>
      </span>
      <span className="relative h-3 rounded-[4px] bg-bar-track">
        {ancho > 0 ? <i className="barra-crece absolute inset-y-0 left-0 min-w-[3px] rounded-r-[4px] bg-bar" style={{ width: `${ancho}%` }} /> : null}
        {meta != null && max > 0 ? <b className="aparece absolute -inset-y-1 w-0.5 rounded-sm bg-fg" style={{ left: `calc(${Math.min(meta / max, 1) * 100}% - 1px)` }} aria-label="Meta" /> : null}
      </span>
      <span className="min-w-[52px] text-right font-semibold tabular-nums">{texto}</span>
    </div>
  );
}

export function Leyenda() {
  return (
    <div className="mt-3.5 flex flex-wrap gap-4 text-[0.76rem] text-muted">
      <span className="inline-flex items-center gap-1.5"><i className="h-2 w-3.5 rounded-sm bg-bar" />Real</span>
      <span className="inline-flex items-center gap-1.5"><b className="h-3 w-0.5 bg-fg" />Meta</span>
    </div>
  );
}

export function Progreso({ valor, className }: { valor: number; className?: string }) {
  return (
    <span className={cx("relative block h-2 overflow-hidden rounded-full bg-bar-track", className)}>
      <i className="barra-crece absolute inset-y-0 left-0 rounded-full bg-bar" style={{ width: `${Math.min(Math.max(valor, 0), 1) * 100}%` }} />
    </span>
  );
}

export function MuestraColor({ hex }: { hex: string }) {
  return <span className="inline-block size-3.5 shrink-0 rounded-full border border-line align-[-2px]" style={{ background: hex }} />;
}

export function Tabla({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className={cx("w-full border-collapse text-[0.86rem] [&_td]:border-b [&_td]:border-line [&_td]:px-3 [&_td]:py-2.5 [&_td]:align-middle [&_td]:tabular-nums [&_th]:whitespace-nowrap [&_th]:border-b [&_th]:border-line [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-[0.7rem] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.07em] [&_th]:text-muted [&_tbody_tr:last-child_td]:border-b-0", className)}>
        {children}
      </table>
    </div>
  );
}

/** Filtros por URL (sin JavaScript). */
export function Segmentos({ opciones, actual, etiqueta }: { opciones: { valor: string; texto: string; href: string }[]; actual: string; etiqueta: string }) {
  return (
    <nav aria-label={etiqueta} className="inline-flex flex-wrap gap-0.5 rounded-xl bg-surface-2 p-1">
      {opciones.map((o) => (
        <Link key={o.valor} href={o.href} aria-current={o.valor === actual ? "page" : undefined} scroll={false}
          className={cx("rounded-lg px-3 py-1.5 text-[0.84rem] font-semibold transition", o.valor === actual ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg")}>
          {o.texto}
        </Link>
      ))}
    </nav>
  );
}
