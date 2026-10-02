"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowLeft, LogIn } from "lucide-react";
import { Avatar, Boton, BotonEnlace } from "@/components/ui";
import { iniciarSesion, type EstadoLogin } from "./acciones";

export type UsuarioDirectorio = { usuario: string; nombre: string; rol: string; iniciales: string; destacado: boolean };

export function SelectorAcceso({ usuarios }: { usuarios: UsuarioDirectorio[] }) {
  const [elegido, setElegido] = useState<UsuarioDirectorio | null>(null);
  const [estado, accion, ocupado] = useActionState<EstadoLogin, FormData>(iniciarSesion, { error: null });
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (elegido) ref.current?.focus(); }, [elegido]);

  if (!usuarios.length) {
    return (
      <div className="grid gap-3 rounded-2xl border border-line bg-surface p-6 shadow-card">
        <h1 className="font-display text-[2rem] font-semibold leading-none">Bienvenido al portal</h1>
        <p className="text-muted">Todavía no hay usuarios. Configura tu acceso de CEO y el del equipo en un paso.</p>
        <div><BotonEnlace href="/instalar">Configurar el portal</BotonEnlace></div>
      </div>
    );
  }

  if (!elegido) {
    return (
      <div className="grid gap-5">
        <div>
          <h1 className="font-display text-[2.6rem] font-semibold leading-none">¿Quién eres?</h1>
          <p className="mt-2 text-muted">Elige tu usuario para entrar a tu sesión.</p>
        </div>
        <ul className="escalonado grid gap-2.5 sm:grid-cols-2">
          {usuarios.map((u) => (
            <li key={u.usuario}>
              <button type="button" onClick={() => setElegido(u)}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg active:scale-[0.98]">
                <Avatar texto={u.iniciales} destacado={u.destacado} tamano="lg" />
                <span className="min-w-0">
                  <strong className="block truncate">{u.nombre}</strong>
                  <span className="block truncate text-[0.8rem] text-muted">{u.rol}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <form action={accion} className="grid gap-5 rounded-2xl border border-line bg-surface p-6 shadow-card">
      <div className="flex items-center gap-3">
        <Avatar texto={elegido.iniciales} destacado={elegido.destacado} tamano="lg" />
        <div className="min-w-0 flex-1">
          <strong className="block text-lg">{elegido.nombre}</strong>
          <span className="text-sm text-muted">{elegido.rol}</span>
        </div>
        <Boton variante="fantasma" tamano="sm" icono={ArrowLeft} onClick={() => setElegido(null)}>Cambiar</Boton>
      </div>
      <input type="hidden" name="usuario" value={elegido.usuario} />
      <div className="grid gap-1.5">
        <label htmlFor="contrasena" className="text-[0.8rem] font-semibold text-muted">Contraseña</label>
        <input ref={ref} id="contrasena" name="contrasena" type="password" autoComplete="current-password" required className="campo h-12 text-base" aria-invalid={!!estado.error} />
        {estado.error ? <span className="text-[0.82rem] font-semibold text-bad" role="alert">{estado.error}</span> : <span className="text-[0.78rem] text-muted">Si es tu primera vez, usa la contraseña temporal que te dio dirección.</span>}
      </div>
      <Boton type="submit" tamano="lg" icono={LogIn} disabled={ocupado}>{ocupado ? "Entrando…" : "Entrar"}</Boton>
    </form>
  );
}
