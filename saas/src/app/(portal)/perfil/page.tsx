import { requerirSesion } from "@/lib/sesion";
import { ROLES } from "@/lib/dominio/catalogos";
import { iniciales } from "@/lib/dominio/formato";
import { Avatar, Encabezado, Tarjeta, TituloTarjeta } from "@/components/ui";
import { FormDatos, FormContrasena } from "./formularios";

export const metadata = { title: "Mi perfil" };

export default async function Perfil() {
  const { perfil, agencia } = await requerirSesion();
  return (
    <>
      <Encabezado eyebrow="Equipo" titulo="Mi perfil" />
      <Tarjeta className="flex flex-wrap items-center gap-4">
        <Avatar texto={perfil.rol === "ceo" ? "CEO" : iniciales(perfil.nombre)} destacado={perfil.rol !== "asesor"} tamano="xl" />
        <div className="min-w-0">
          <p className="font-display text-[2rem] font-semibold leading-none">{perfil.nombre}</p>
          <p className="mt-1 text-muted">{ROLES[perfil.rol]}{perfil.vende ? " · registra ventas" : ""} · {agencia.nombre}</p>
          <p className="mt-1 font-mono text-[0.84rem] text-muted">Usuario: {perfil.usuario}</p>
        </div>
      </Tarjeta>
      <div className="grid gap-5 lg:grid-cols-2">
        <Tarjeta><TituloTarjeta titulo="Mis datos" /><FormDatos nombreCorto={perfil.nombre_corto} telefono={perfil.telefono ?? ""} /></Tarjeta>
        <Tarjeta><TituloTarjeta titulo="Cambiar contraseña" nota="Mínimo 8 caracteres" /><FormContrasena /></Tarjeta>
      </div>
    </>
  );
}
