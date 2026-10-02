"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Pencil, UserPlus, Users } from "lucide-react";
import { Avatar, Boton, Campo, Pastilla, Tabla, Tarjeta } from "@/components/ui";
import { BotonCopiar, Confirmar, Dialogo, useAviso } from "@/components/cliente";
import { ROLES, type Rol } from "@/lib/dominio/catalogos";
import { decimal, iniciales } from "@/lib/dominio/formato";
import type { Perfil } from "@/lib/tipos";
import { actualizarUsuario, contrasenaParaTodos, crearUsuario, restablecerContrasena } from "./acciones";

type Persona = Perfil & { unidades: number; productos: number; meta: number | null; corteHoy: boolean; academia: string };

export function ListaEquipo({ personas, yo }: { personas: Persona[]; yo: { id: string; rol: Rol } }) {
  const router = useRouter();
  const avisar = useAviso();
  const [editar, setEditar] = useState<Persona | "nueva" | null>(null);
  const [reset, setReset] = useState<Persona | null>(null);
  const [credencial, setCredencial] = useState<{ nombre: string; usuario: string; contrasena: string } | null>(null);
  const [ocupado, iniciar] = useTransition();
  const [comun, setComun] = useState(false);
  const puede = (p: Persona) => yo.rol === "ceo" || p.rol !== "ceo";

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Boton variante="secundario" icono={Users} onClick={() => setComun(true)}>Misma contraseña para todos</Boton>
        <Boton icono={UserPlus} onClick={() => setEditar("nueva")}>Dar de alta</Boton>
      </div>
      <Tarjeta className="p-2 sm:p-3">
        <Tabla>
          <thead><tr><th>Persona</th><th>Usuario</th><th>Rol</th><th className="!text-right">Unidades del mes</th><th className="!text-right">Prod./unidad</th><th>Corte hoy</th><th>Academia</th><th /></tr></thead>
          <tbody>
            {personas.map((p) => (
              <tr key={p.id} className={p.activo ? "" : "opacity-55"}>
                <td><span className="flex items-center gap-2.5 whitespace-nowrap"><Avatar texto={p.rol === "ceo" ? "CEO" : iniciales(p.nombre)} destacado={p.rol !== "asesor"} tamano="sm" /><strong>{p.rol === "ceo" ? p.nombre_corto : p.nombre}</strong>{p.id === yo.id ? <Pastilla>Tú</Pastilla> : null}</span></td>
                <td className="font-mono text-[0.8rem]">{p.usuario}</td>
                <td className="whitespace-nowrap">{ROLES[p.rol]}{p.rol !== "asesor" && p.vende ? " · vende" : ""}{!p.activo ? <Pastilla tono="bad" className="ml-1.5">Baja</Pastilla> : null}</td>
                <td className="text-right">{p.meta != null ? <>{p.unidades}<span className="text-muted"> / {p.meta}</span></> : "—"}</td>
                <td className="text-right">{p.vende && p.unidades ? decimal(p.productos / p.unidades) : "—"}</td>
                <td>{p.vende ? <Pastilla tono={p.corteHoy ? "ok" : "warn"}>{p.corteHoy ? "Capturado" : "Pendiente"}</Pastilla> : "—"}</td>
                <td>{p.academia}</td>
                <td className="whitespace-nowrap text-right">
                  {puede(p) ? <>
                    <Boton variante="fantasma" tamano="sm" icono={Pencil} onClick={() => setEditar(p)} aria-label={`Editar a ${p.nombre}`}>Editar</Boton>
                    {p.id !== yo.id ? <Boton variante="fantasma" tamano="sm" icono={KeyRound} onClick={() => setReset(p)} aria-label={`Nueva contraseña para ${p.nombre}`}>Contraseña</Boton> : null}
                  </> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Tarjeta>

      <Dialogo abierto={editar !== null} alCerrar={() => setEditar(null)} titulo={editar === "nueva" ? "Dar de alta" : editar ? editar.nombre : ""} subtitulo={editar === "nueva" ? "Se crea su acceso con una contraseña temporal." : undefined} ancho="sm">
        {editar !== null ? <FormPersona key={editar === "nueva" ? "nueva" : editar.id} persona={editar === "nueva" ? null : editar} yo={yo}
          alTerminar={(c) => { setEditar(null); router.refresh(); if (c) setCredencial(c); }} /> : null}
      </Dialogo>

      <Confirmar abierto={reset !== null} alCerrar={() => setReset(null)} titulo={`¿Nueva contraseña para ${reset?.nombre ?? ""}?`} boton="Generar contraseña" ocupado={ocupado}
        texto="Su contraseña actual deja de funcionar. Le das la nueva y la cambia en Mi perfil."
        alConfirmar={() => { const p = reset!; iniciar(async () => { const r = await restablecerContrasena(p.id); setReset(null); if (!r.ok) { avisar(r.error, "error"); return; } setCredencial({ nombre: p.nombre, usuario: p.usuario, contrasena: r.contrasena! }); }); }} />

      <Dialogo abierto={comun} alCerrar={() => setComun(false)} titulo="Misma contraseña para todos" subtitulo="Se le pone a todo el equipo activo (sin el CEO), incluido tú. Quien tenga la sesión abierta la sigue usando." ancho="sm">
        {comun ? <FormClaveComun alTerminar={(m) => { setComun(false); if (m) avisar(m); }} /> : null}
      </Dialogo>

      <Dialogo abierto={credencial !== null} alCerrar={() => setCredencial(null)} titulo="Acceso listo" ancho="sm" pie={<Boton onClick={() => setCredencial(null)}>Listo</Boton>}>
        {credencial ? (
          <div className="grid gap-3">
            <p className="text-muted">Dale estos datos a <strong className="text-fg">{credencial.nombre}</strong>. La contraseña solo se muestra esta vez.</p>
            <dl className="grid gap-2 rounded-xl bg-surface-2 p-4 font-mono text-[0.92rem]">
              <div className="flex justify-between gap-3"><dt className="text-muted">Usuario</dt><dd className="m-0 font-semibold">{credencial.usuario}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Contraseña</dt><dd className="m-0 font-semibold">{credencial.contrasena}</dd></div>
            </dl>
            <BotonCopiar texto={`Portal Park Point\nUsuario: ${credencial.usuario}\nContraseña temporal: ${credencial.contrasena}\nCámbiala en Mi perfil al entrar.`} etiqueta="Copiar para WhatsApp" />
          </div>
        ) : null}
      </Dialogo>
    </>
  );
}

function FormPersona({ persona, yo, alTerminar }: { persona: Persona | null; yo: { id: string; rol: Rol }; alTerminar: (c?: { nombre: string; usuario: string; contrasena: string }) => void }) {
  const avisar = useAviso();
  const [ocupado, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ nombre: persona?.nombre ?? "", nombre_corto: persona?.nombre_corto ?? "", usuario: persona?.usuario ?? "", email: "", rol: persona?.rol ?? ("asesor" as Rol), vende: persona?.vende ?? true, activo: persona?.activo ?? true });
  const propio = persona?.id === yo.id;
  const rolesPermitidos: Rol[] = yo.rol === "ceo" ? ["asesor", "gerente", "ceo"] : ["asesor"];
  return (
    <form className="grid gap-4" onSubmit={(e) => {
      e.preventDefault();
      iniciar(async () => {
        if (persona) {
          const r = await actualizarUsuario({ id: persona.id, nombre: f.nombre, nombre_corto: f.nombre_corto, rol: f.rol, vende: f.vende, activo: f.activo });
          if (!r.ok) { setError(r.error); return; }
          avisar(r.mensaje); alTerminar();
        } else {
          const r = await crearUsuario({ nombre: f.nombre, nombre_corto: f.nombre_corto || f.nombre.split(" ")[0], usuario: f.usuario, rol: f.rol, vende: f.vende, email: f.email });
          if (!r.ok) { setError(r.error); return; }
          avisar(r.mensaje); alTerminar({ nombre: f.nombre, usuario: f.usuario.toLowerCase(), contrasena: r.contrasena! });
        }
      });
    }}>
      <Campo etiqueta="Nombre completo" htmlFor="e-nombre" requerido><input id="e-nombre" className="campo" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Campo>
      <div className="grid grid-cols-2 gap-4">
        <Campo etiqueta="Cómo se le dice" htmlFor="e-corto"><input id="e-corto" className="campo" value={f.nombre_corto} onChange={(e) => setF({ ...f, nombre_corto: e.target.value })} placeholder={f.nombre.split(" ")[0]} /></Campo>
        <Campo etiqueta="Usuario" htmlFor="e-usuario" requerido={!persona} ayuda={persona ? "No se puede cambiar." : "Minúsculas, sin espacios."}><input id="e-usuario" className="campo font-mono" value={f.usuario} disabled={!!persona} onChange={(e) => setF({ ...f, usuario: e.target.value.toLowerCase().replace(/\s/g, "") })} /></Campo>
      </div>
      {!persona ? <Campo etiqueta="Correo (opcional)" htmlFor="e-email" ayuda="Si no tiene, se crea un acceso interno."><input id="e-email" type="email" className="campo" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Campo> : null}
      <Campo etiqueta="Rol" htmlFor="e-rol">
        <select id="e-rol" className="campo" value={f.rol} disabled={propio} onChange={(e) => { const rol = e.target.value as Rol; setF({ ...f, rol, vende: rol === "ceo" ? false : f.vende }); }}>
          {(rolesPermitidos.includes(f.rol) ? rolesPermitidos : [f.rol, ...rolesPermitidos]).map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}
        </select>
      </Campo>
      <label className="inline-flex items-center gap-2.5 text-[0.9rem]"><input type="checkbox" className="size-4 accent-[var(--accent)]" checked={f.vende} onChange={(e) => setF({ ...f, vende: e.target.checked })} />Registra ventas (aparece como vendedor y tiene meta)</label>
      {persona && !propio ? <label className="inline-flex items-center gap-2.5 text-[0.9rem]"><input type="checkbox" className="size-4 accent-[var(--accent)]" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} />Acceso activo (desmarca para dar de baja)</label> : null}
      {error ? <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-sm font-semibold text-bad">{error}</p> : null}
      <div className="flex gap-2"><Boton type="submit" disabled={ocupado}>{ocupado ? "Guardando…" : persona ? "Guardar" : "Dar de alta"}</Boton></div>
    </form>
  );
}

function FormClaveComun({ alTerminar }: { alTerminar: (mensaje?: string) => void }) {
  const avisar = useAviso();
  const [ocupado, iniciar] = useTransition();
  const [clave, setClave] = useState("");
  const [otra, setOtra] = useState("");
  const distinta = otra.length > 0 && clave !== otra;
  return (
    <form className="grid gap-4" onSubmit={(e) => {
      e.preventDefault();
      if (clave !== otra) return;
      iniciar(async () => { const r = await contrasenaParaTodos(clave); if (!r.ok) { avisar(r.error, "error"); return; } alTerminar(r.mensaje); });
    }}>
      <Campo etiqueta="Contraseña nueva" htmlFor="c-comun" ayuda="Mínimo 7 caracteres."><input id="c-comun" type="password" autoComplete="new-password" className="campo" value={clave} onChange={(e) => setClave(e.target.value)} minLength={7} required /></Campo>
      <Campo etiqueta="Repítela" htmlFor="c-comun-2" error={distinta ? "No coinciden." : null}><input id="c-comun-2" type="password" autoComplete="new-password" className="campo" value={otra} onChange={(e) => setOtra(e.target.value)} aria-invalid={distinta} required /></Campo>
      <div className="flex justify-end gap-2">
        <Boton variante="secundario" onClick={() => alTerminar()}>Cancelar</Boton>
        <Boton type="submit" disabled={ocupado || clave.length < 7 || clave !== otra}>{ocupado ? "Guardando…" : "Poner a todos"}</Boton>
      </div>
    </form>
  );
}
