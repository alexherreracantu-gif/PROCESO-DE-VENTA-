import { requerirSesion } from "@/lib/sesion";
import { ROLES } from "@/lib/dominio/catalogos";
import { iniciales } from "@/lib/dominio/formato";
import { Avatar } from "@/components/ui";
import { Continuar } from "./continuar";
import { Logo } from "@/components/marca";

export const metadata = { title: "Bienvenido" };

export default async function Bienvenida() {
  const { perfil, agencia } = await requerirSesion();
  const ceo = perfil.rol === "ceo";
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-accent-soft px-4 text-fg">
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full border-[56px] border-brand/10" />
      <div className="absolute left-1/2 top-[max(32px,env(safe-area-inset-top))] -translate-x-1/2"><Logo tono="azul" ancho={170} prioridad /></div>
      <div className="escalonado relative grid justify-items-center gap-3 text-center">
        <span className="salta"><Avatar texto={ceo ? "CEO" : iniciales(perfil.nombre)} tamano="xl" destacado /></span>
        <p className="eyebrow mt-2 !text-accent">Bienvenido</p>
        <h1 className="font-display text-[3rem] font-semibold leading-none">Eres {ceo ? "el CEO" : perfil.nombre}</h1>
        <p className="text-muted">{ROLES[perfil.rol]}{perfil.rol === "gerente" && perfil.vende ? " · también registras tus ventas" : ""} · {agencia.nombre}</p>
        <Continuar />
      </div>
    </main>
  );
}
