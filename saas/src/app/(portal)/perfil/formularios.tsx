"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton, Campo } from "@/components/ui";
import { useAviso } from "@/components/cliente";
import { actualizarDatos, cambiarContrasena } from "./acciones";

export function FormDatos({ nombreCorto, telefono }: { nombreCorto: string; telefono: string }) {
  const router = useRouter(); const avisar = useAviso();
  const [f, setF] = useState({ nombre_corto: nombreCorto, telefono });
  const [ocupado, iniciar] = useTransition();
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); iniciar(async () => { const r = await actualizarDatos(f); avisar(r.ok ? r.mensaje ?? "Guardado" : r.error, r.ok ? "ok" : "error"); if (r.ok) router.refresh(); }); }}>
      <Campo etiqueta="Cómo te dicen" htmlFor="pf-corto"><input id="pf-corto" className="campo" value={f.nombre_corto} onChange={(e) => setF({ ...f, nombre_corto: e.target.value })} /></Campo>
      <Campo etiqueta="Tu WhatsApp" htmlFor="pf-tel"><input id="pf-tel" type="tel" className="campo" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} placeholder="10 dígitos" /></Campo>
      <div><Boton type="submit" disabled={ocupado}>{ocupado ? "Guardando…" : "Guardar"}</Boton></div>
    </form>
  );
}

export function FormContrasena() {
  const avisar = useAviso();
  const [f, setF] = useState({ actual: "", nueva: "", repetir: "" });
  const [error, setError] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();
  return (
    <form className="grid gap-4" onSubmit={(e) => {
      e.preventDefault();
      if (f.nueva !== f.repetir) { setError("Las contraseñas nuevas no coinciden."); return; }
      iniciar(async () => {
        const r = await cambiarContrasena({ actual: f.actual, nueva: f.nueva });
        if (!r.ok) { setError(r.error); return; }
        setError(null); setF({ actual: "", nueva: "", repetir: "" }); avisar(r.mensaje ?? "Contraseña actualizada");
      });
    }}>
      <Campo etiqueta="Contraseña actual" htmlFor="pf-actual"><input id="pf-actual" type="password" autoComplete="current-password" className="campo" value={f.actual} onChange={(e) => setF({ ...f, actual: e.target.value })} /></Campo>
      <Campo etiqueta="Nueva contraseña" htmlFor="pf-nueva"><input id="pf-nueva" type="password" autoComplete="new-password" minLength={8} className="campo" value={f.nueva} onChange={(e) => setF({ ...f, nueva: e.target.value })} /></Campo>
      <Campo etiqueta="Repite la nueva" htmlFor="pf-rep"><input id="pf-rep" type="password" autoComplete="new-password" className="campo" value={f.repetir} onChange={(e) => setF({ ...f, repetir: e.target.value })} /></Campo>
      {error ? <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-sm font-semibold text-bad">{error}</p> : null}
      <div><Boton type="submit" disabled={ocupado || !f.actual || !f.nueva}>{ocupado ? "Cambiando…" : "Cambiar contraseña"}</Boton></div>
    </form>
  );
}
