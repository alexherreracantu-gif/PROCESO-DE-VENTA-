"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import {
  BarChart3, BookOpenCheck, Calculator, CarFront, ClipboardList, Cog, Home, KanbanSquare, LogOut, Menu,
  MessagesSquare, Monitor, Moon, Sparkles, Sun, Target, UserRound, Users, X, type LucideIcon,
} from "lucide-react";
import { Avatar, cx } from "@/components/ui";

type Item = { href: string; texto: string; icono: LucideIcon; direccion?: boolean };
const GRUPOS: { titulo: string; items: Item[] }[] = [
  { titulo: "Operación", items: [
    { href: "/inicio", texto: "Inicio", icono: Home },
    { href: "/ventas", texto: "Ventas", icono: CarFront },
    { href: "/tablero", texto: "Tablero de reporte", icono: BarChart3 },
    { href: "/objetivos", texto: "Objetivos", icono: Target },
    { href: "/piso", texto: "Corte de piso", icono: ClipboardList },
  ] },
  { titulo: "Vender", items: [
    { href: "/crm", texto: "Prospectos", icono: KanbanSquare },
    { href: "/cotizador", texto: "Cotizador", icono: Calculator },
    { href: "/guiones", texto: "Guiones", icono: MessagesSquare },
    { href: "/agente", texto: "Agente IA", icono: Sparkles },
  ] },
  { titulo: "Equipo", items: [
    { href: "/academia", texto: "Academia BYD", icono: BookOpenCheck },
    { href: "/equipo", texto: "Equipo", icono: Users, direccion: true },
    { href: "/catalogo", texto: "Catálogo y precios", icono: Cog, direccion: true },
    { href: "/perfil", texto: "Mi perfil", icono: UserRound },
  ] },
];

type Tema = "system" | "light" | "dark";
const suscribirTema = (cb: () => void) => { window.addEventListener("tema", cb); return () => window.removeEventListener("tema", cb); };
const leerTema = (): Tema => { const t = document.documentElement.dataset.theme; return t === "light" || t === "dark" ? t : "system"; };
function useTema(): [Tema, () => void] {
  const tema = useSyncExternalStore(suscribirTema, leerTema, () => "system" as Tema);
  const ciclar = () => {
    const sig: Tema = tema === "system" ? "dark" : tema === "dark" ? "light" : "system";
    try {
      if (sig === "system") { localStorage.removeItem("tema"); delete document.documentElement.dataset.theme; }
      else { localStorage.setItem("tema", sig); document.documentElement.dataset.theme = sig; }
    } catch { /* sin almacenamiento */ }
    window.dispatchEvent(new Event("tema"));
  };
  return [tema, ciclar];
}

export function Marco({ usuario, agencia, direccion, children }: {
  usuario: { nombre: string; corto: string; rol: string; iniciales: string; destacado: boolean };
  agencia: string; direccion: boolean; children: ReactNode;
}) {
  const ruta = usePathname();
  const [menu, setMenu] = useState(false);
  const [tema, ciclarTema] = useTema();
  const IconoTema = tema === "dark" ? Moon : tema === "light" ? Sun : Monitor;
  const nombreTema = tema === "dark" ? "Tema oscuro" : tema === "light" ? "Tema claro" : "Tema del sistema";

  return (
    <div className="min-h-dvh">
      <aside className={cx(
        "fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-side pt-[env(safe-area-inset-top)] text-side-fg transition-transform duration-200",
        "max-lg:w-[272px] max-lg:shadow-2xl", menu ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
      )}>
        <div className="flex items-start gap-2 px-5 pb-4 pt-6">
          <Link href="/inicio" className="min-w-0 flex-1">
            <span className="block font-display text-[1.75rem] font-bold leading-none tracking-[0.05em]">PARK POINT</span>
            <span className="mt-1.5 block truncate text-[0.74rem] text-side-muted">{agencia}</span>
          </Link>
          <button type="button" onClick={() => setMenu(false)} aria-label="Cerrar menú" className="grid size-8 place-items-center rounded-lg text-side-muted hover:bg-side-2 lg:hidden"><X className="size-4" /></button>
        </div>
        <nav aria-label="Módulos" className="flex-1 overflow-y-auto px-3 pb-4">
          {GRUPOS.map((g) => (
            <div key={g.titulo} className="mb-2">
              <p className="px-3 pb-1 pt-3 text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-side-muted">{g.titulo}</p>
              {g.items.filter((i) => !i.direccion || direccion).map((i) => {
                const activo = ruta === i.href || ruta.startsWith(i.href + "/");
                const Icono = i.icono;
                return (
                  <Link key={i.href} href={i.href} aria-current={activo ? "page" : undefined} onClick={() => setMenu(false)}
                    className={cx("relative flex h-10 items-center gap-3 rounded-lg px-3 text-[0.9rem] font-medium transition",
                      activo ? "bg-side-2 text-side-fg" : "text-side-muted hover:bg-side-2/60 hover:text-side-fg")}>
                    {activo ? <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-bar" aria-hidden /> : null}
                    <Icono className="size-[18px] shrink-0" strokeWidth={1.8} aria-hidden />
                    {i.texto}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="flex items-center gap-2.5 border-t border-side-2 px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3.5">
          <Avatar texto={usuario.iniciales} destacado={usuario.destacado} />
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-[0.88rem]">{usuario.nombre}</strong>
            <span className="text-[0.74rem] text-side-muted">{usuario.rol}</span>
          </div>
          <button type="button" onClick={ciclarTema} title={nombreTema} aria-label={nombreTema} className="grid size-8 place-items-center rounded-lg text-side-muted hover:bg-side-2 hover:text-side-fg"><IconoTema className="size-4" /></button>
          <form action="/salir" method="post">
            <button type="submit" title="Cerrar sesión" aria-label="Cerrar sesión" className="grid size-8 place-items-center rounded-lg text-side-muted hover:bg-side-2 hover:text-side-fg"><LogOut className="size-4" /></button>
          </form>
        </div>
      </aside>
      {menu ? <button type="button" aria-label="Cerrar menú" className="fixed inset-0 z-30 bg-black/45 lg:hidden" onClick={() => setMenu(false)} /> : null}

      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-surface/95 px-4 pb-2.5 pt-[calc(10px+env(safe-area-inset-top))] backdrop-blur lg:hidden">
        <button type="button" onClick={() => setMenu(true)} aria-label="Abrir menú" className="grid size-9 place-items-center rounded-lg border border-line"><Menu className="size-[18px]" /></button>
        <span className="flex-1 font-display text-[1.35rem] font-bold tracking-[0.05em]">PARK POINT</span>
        <span className="text-right text-[0.76rem] leading-tight text-muted">{usuario.corto}<br />{usuario.rol}</span>
      </header>

      <main className="px-4 pb-20 pt-5 sm:px-6 lg:ml-[248px] lg:px-8 lg:pt-8">
        <div className="mx-auto grid max-w-[1180px] gap-6">{children}</div>
      </main>
    </div>
  );
}
