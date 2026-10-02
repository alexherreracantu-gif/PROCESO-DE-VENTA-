"use client";

import { useActionState } from "react";
import { Boton, BotonEnlace, Campo, Tarjeta } from "@/components/ui";
import { BotonCopiar } from "@/components/cliente";
import { instalar, type EstadoInstalacion } from "./acciones";

export function FormInstalar({ equipo, pideCodigo }: { equipo: { usuario: string; nombre: string; rol: string }[]; pideCodigo: boolean }) {
  const [estado, accion, ocupado] = useActionState<EstadoInstalacion, FormData>(instalar, { error: null, credenciales: null });

  if (estado.credenciales) {
    const texto = estado.credenciales.map((c) => `${c.nombre}\nUsuario: ${c.usuario}\nContraseña temporal: ${c.contrasena}`).join("\n\n");
    return (
      <Tarjeta className="grid gap-4">
        <h2 className="text-lg font-semibold">Listo. Ya puedes entrar como CEO.</h2>
        {estado.credenciales.length ? (
          <>
            <p className="text-muted">Estas contraseñas temporales <strong className="text-fg">solo se muestran ahora</strong>. Cópialas y mándale a cada quien la suya; la cambian en Mi perfil.</p>
            <pre className="whitespace-pre-wrap rounded-xl bg-surface-2 p-4 font-mono text-[0.86rem]">{texto}</pre>
            <div><BotonCopiar texto={texto} etiqueta="Copiar todo" variante="secundario" tamano="md" /></div>
          </>
        ) : null}
        <div><BotonEnlace href="/login">Ir al inicio de sesión</BotonEnlace></div>
      </Tarjeta>
    );
  }

  return (
    <form action={accion} className="grid gap-5">
      <Tarjeta className="grid gap-4">
        <h2 className="font-semibold">1. Tu acceso (CEO)</h2>
        {pideCodigo ? <Campo etiqueta="Código de instalación" htmlFor="i-codigo" ayuda="El que pusiste en Vercel como CODIGO_INSTALACION."><input id="i-codigo" name="codigo" className="campo" autoComplete="off" required /></Campo> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Contraseña" htmlFor="i-clave" ayuda="Mínimo 8 caracteres."><input id="i-clave" name="contrasena" type="password" minLength={8} autoComplete="new-password" className="campo" required /></Campo>
          <Campo etiqueta="Repítela" htmlFor="i-rep"><input id="i-rep" name="repetir" type="password" autoComplete="new-password" className="campo" required /></Campo>
        </div>
        <p className="text-[0.82rem] text-muted">Tu usuario será <span className="font-mono">ceo</span>.</p>
      </Tarjeta>
      <Tarjeta className="grid gap-3">
        <h2 className="font-semibold">2. Equipo</h2>
        <p className="text-sm text-muted">Se crea su acceso con una contraseña temporal. Después puedes dar de alta a más personas en Equipo.</p>
        {equipo.map((u) => (
          <label key={u.usuario} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5">
            <input type="checkbox" name="usuarios" value={u.usuario} defaultChecked className="size-4 accent-[var(--accent)]" />
            <span className="flex-1"><strong>{u.nombre}</strong> <span className="text-sm text-muted">· {u.rol}</span></span>
            <span className="font-mono text-[0.8rem] text-muted">{u.usuario}</span>
          </label>
        ))}
      </Tarjeta>
      {estado.error ? <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-sm font-semibold text-bad">{estado.error}</p> : null}
      <div><Boton type="submit" tamano="lg" disabled={ocupado}>{ocupado ? "Configurando…" : "Crear accesos"}</Boton></div>
    </form>
  );
}
