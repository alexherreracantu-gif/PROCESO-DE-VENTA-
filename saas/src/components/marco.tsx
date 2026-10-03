"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BarChart3, BookOpenCheck, CalendarDays, Wallet, Calculator, CarFront, ClipboardList, Cog, Home, KanbanSquare, LogOut, Menu,
  Images, Megaphone, MessagesSquare, Sparkles, Target, UserRound, Users, X, type LucideIcon,
} from "lucide-react";
import { Avatar, cx } from "@/components/ui";
import { Insignia, Logo } from "@/components/marca";
import { VISIBLE } from "@/lib/config";
import { BarraNavegacion } from "@/components/barra-navegacion";

type Item = { href: string; texto: string; icono: LucideIcon; direccion?: boolean; oculto?: boolean };
const GRUPOS: { titulo: string; items: Item[] }[] = [
  { titulo: "Operación", items: [
    { href: "/inicio", texto: "Inicio", icono: Home },
    { href: "/ventas", texto: "Ventas", icono: CarFront },
    { href: "/entregas", texto: "Entregas", icono: CalendarDays },
    { href: "/comisiones", texto: "Mis comisiones", icono: Wallet },
    { href: "/tablero", texto: "Tablero de reporte", icono: BarChart3 },
    { href: "/objetivos", texto: "Objetivos", icono: Target },
    { href: "/piso", texto: "Corte de piso", icono: ClipboardList },
  ] },
  { titulo: "Vender", items: [
    { href: "/crm", texto: "Prospectos", icono: KanbanSquare },
    { href: "/cotizador", texto: "Cotizador", icono: Calculator },
    { href: "/fotos", texto: "Fotos de modelos", icono: Images },
    { href: "/anuncios", texto: "Generador de anuncios", icono: Megaphone },
    { href: "/guiones", texto: "Guiones", icono: MessagesSquare },
    { href: "/agente", texto: "Agente IA", icono: Sparkles, oculto: !VISIBLE.agente },
  ] },
  { titulo: "Equipo", items: [
    { href: "/academia", texto: "Academia BYD", icono: BookOpenCheck },
    { href: "/equipo", texto: "Equipo", icono: Users, direccion: true },
    { href: "/catalogo", texto: "Catálogo y precios", icono: Cog, direccion: true },
    { href: "/perfil", texto: "Mi perfil", icono: UserRound },
  ] },
];

export function Marco({ usuario, agencia, direccion, children }: {
  usuario: { nombre: string; corto: string; rol: string; iniciales: string; destacado: boolean };
  agencia: string; direccion: boolean; children: ReactNode;
}) {
  const ruta = usePathname();
  const [menu, setMenu] = useState(false);

  return (
    <div className="min-h-dvh">
      <BarraNavegacion />
      <aside className={cx(
        "fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-line bg-side pt-[env(safe-area-inset-top)] text-side-fg transition-transform duration-200",
        "max-lg:w-[272px] max-lg:shadow-2xl", menu ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
      )}>
        <div className="flex items-start gap-2 px-5 pb-4 pt-6">
          <Link href="/inicio" className="min-w-0 flex-1 [animation:entrar_0.6s_cubic-bezier(0.2,0.7,0.2,1)_both]" aria-label="Inicio">
            <Logo tono="azul" ancho={142} prioridad />
            <span className="mt-3 flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-side-muted">
              <span className="h-px w-4 bg-brand" aria-hidden />Portal Park Point
            </span>
            <span className="mt-0.5 block truncate text-[0.74rem] text-side-muted/80">{agencia}</span>
          </Link>
          <button type="button" onClick={() => setMenu(false)} aria-label="Cerrar menú" className="grid size-8 place-items-center rounded-lg text-side-muted hover:bg-side-2 lg:hidden"><X className="size-4" /></button>
        </div>
        <nav aria-label="Módulos" className="escalonado flex-1 overflow-y-auto px-3 pb-4">
          {GRUPOS.map((g) => (
            <div key={g.titulo} className="mb-2">
              <p className="px-3 pb-1 pt-3 text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-side-muted">{g.titulo}</p>
              {g.items.filter((i) => !i.oculto && (!i.direccion || direccion)).map((i) => {
                const activo = ruta === i.href || ruta.startsWith(i.href + "/");
                const Icono = i.icono;
                return (
                  <Link key={i.href} href={i.href} aria-current={activo ? "page" : undefined} onClick={() => setMenu(false)}
                    className={cx("relative flex h-10 items-center gap-3 rounded-lg px-3 text-[0.9rem] font-medium transition-all duration-200",
                      activo ? "bg-side-2 font-semibold text-accent" : "text-side-muted hover:translate-x-0.5 hover:bg-side-2/60 hover:text-side-fg")}>
                    {activo ? <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-brand [animation:aparecer_0.3s_ease-out]" aria-hidden /> : null}
                    <Icono className="size-[18px] shrink-0" strokeWidth={1.8} aria-hidden />
                    {i.texto}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="flex items-center gap-2.5 border-t border-line px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3.5">
          <Avatar texto={usuario.iniciales} destacado={usuario.destacado} />
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-[0.88rem]">{usuario.nombre}</strong>
            <span className="text-[0.74rem] text-side-muted">{usuario.rol}</span>
          </div>
          <form action="/salir" method="post">
            <button type="submit" title="Cerrar sesión" aria-label="Cerrar sesión" className="grid size-8 place-items-center rounded-lg text-side-muted hover:bg-side-2 hover:text-side-fg"><LogOut className="size-4" /></button>
          </form>
        </div>
      </aside>
      {menu ? <button type="button" aria-label="Cerrar menú" className="fixed inset-0 z-30 bg-black/25 lg:hidden [animation:aparecer_0.2s_ease-out]" onClick={() => setMenu(false)} /> : null}

      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-surface/95 px-4 pb-2.5 pt-[calc(10px+env(safe-area-inset-top))] backdrop-blur lg:hidden">
        <button type="button" onClick={() => setMenu(true)} aria-label="Abrir menú" className="grid size-9 place-items-center rounded-lg border border-line"><Menu className="size-[18px]" /></button>
        <Link href="/inicio" className="flex flex-1 items-center gap-2.5" aria-label="Inicio"><Insignia tamano={32} /><span className="font-display text-[1.3rem] font-bold tracking-[0.04em]">PARK POINT</span></Link>
        <span className="text-right text-[0.76rem] leading-tight text-muted">{usuario.corto}<br />{usuario.rol}</span>
      </header>

      <main className="px-4 pb-20 pt-5 sm:px-6 lg:ml-[248px] lg:px-8 lg:pt-8">
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>
    </div>
  );
}
