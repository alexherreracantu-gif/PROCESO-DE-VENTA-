import { requerirSesion } from "@/lib/sesion";
import { ROLES } from "@/lib/dominio/catalogos";
import { iniciales } from "@/lib/dominio/formato";
import { Avatar } from "@/components/ui";
import { Continuar } from "./continuar";

export const metadata = { title: "Bienvenido" };

export default async function Bienvenida() {
  const { perfil, agencia } = await requerirSesion();
  const ceo = perfil.rol === "ceo";
  return (
    <main className="grid min-h-dvh place-items-center bg-side px-4 text-side-fg">
      <div className="grid justify-items-center gap-3 text-center">
        <Avatar texto={ceo ? "CEO" : iniciales(perfil.nombre)} destacado tamano="xl" />
        <p className="eyebrow !text-side-muted mt-2">Bienvenido</p>
        <h1 className="font-display text-[3rem] font-semibold leading-none">Eres {ceo ? "el CEO" : perfil.nombre}</h1>
        <p className="text-side-muted">{ROLES[perfil.rol]}{perfil.rol === "gerente" && perfil.vende ? " · también registras tus ventas" : ""} · {agencia.nombre}</p>
        <Continuar />
      </div>
    </main>
  );
}
