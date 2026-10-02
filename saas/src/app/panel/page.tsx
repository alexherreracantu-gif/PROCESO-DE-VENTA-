import Link from "next/link";
import { redirect } from "next/navigation";
import { LogIn } from "lucide-react";
import { configurado } from "@/lib/config";
import { sesionPanel } from "@/lib/panel";
import { Logo } from "@/components/marca";
import { VistaTablero, filtrosTablero } from "@/components/tablero/vista";
import { Refrescar } from "./refrescar";

export const metadata = { title: "Dashboard general" };

/** Dashboard general sin usuario: el tablero de todo el equipo, de solo lectura. */
export default async function Panel(props: PageProps<"/panel">) {
  if (!configurado) redirect("/configurar");
  const s = await sesionPanel();
  const { mes, vendedor } = s ? filtrosTablero(s, await props.searchParams) : { mes: "", vendedor: null };
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Logo tono="azul" ancho={118} prioridad />
          <span className="h-6 w-px bg-line max-sm:hidden" aria-hidden />
          <p className="flex-1 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-muted max-sm:hidden">Dashboard general</p>
          <Link href="/login" className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:bg-surface-2">
            <LogIn className="size-4" aria-hidden />Entrar
          </Link>
        </div>
      </header>
      <main className="px-4 pb-20 pt-5 sm:px-6 lg:px-8 lg:pt-8">
        <div className="mx-auto grid max-w-[1180px] gap-6">
          {s ? <VistaTablero s={s} mes={mes} vendedor={vendedor} base="/panel" publico titulo="Dashboard general" /> : <p className="text-muted">El portal todavía no está configurado.</p>}
        </div>
      </main>
      <Refrescar segundos={300} />
    </div>
  );
}
