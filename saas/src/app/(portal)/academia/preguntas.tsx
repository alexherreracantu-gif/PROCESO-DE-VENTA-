"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton, cx } from "@/components/ui";
import { useAviso } from "@/components/cliente";
import type { Pregunta } from "@/lib/academia";
import { repetirExamen, repetirModulo, responder, terminarExamen } from "./acciones";

export function Preguntas({ tipo, preguntas, respuestas, revelar, modulo }: { tipo: "quiz" | "examen"; preguntas: Pregunta[]; respuestas: Record<string, number>; revelar: boolean; modulo?: string }) {
  const router = useRouter();
  const avisar = useAviso();
  const [, iniciar] = useTransition();
  const [locales, marcar] = useOptimistic(respuestas, (estado: Record<string, number>, [id, op]: [string, number]) => ({ ...estado, [id]: op }));
  const contestadas = preguntas.filter((q) => locales[q.id] !== undefined).length;
  const elegir = (q: Pregunta, i: number) => iniciar(async () => {
    marcar([q.id, i]);
    const r = await responder(tipo, q.id, i);
    if (!r.ok) avisar(r.error, "error");
    router.refresh();
  });

  return (
    <div className="grid gap-7">
      {preguntas.map((q, n) => {
        const el = locales[q.id];
        const mostrar = (tipo === "quiz" && el !== undefined) || revelar;
        return (
          <fieldset key={q.id} className="grid gap-2">
            <legend className="mb-2 font-semibold">{n + 1}. {q.q}</legend>
            {q.options.map((o, i) => (
              <button key={i} type="button" disabled={revelar || (tipo === "quiz" && el !== undefined)} onClick={() => elegir(q, i)}
                className={cx("rounded-xl border px-3.5 py-2.5 text-left text-[0.92rem] transition disabled:cursor-default",
                  mostrar && i === q.answer ? "border-ok bg-ok-soft font-semibold text-ok"
                    : mostrar && i === el ? "border-bad bg-bad-soft text-bad"
                      : el === i ? "border-fg shadow-[inset_0_0_0_1px_var(--fg)]" : "border-line hover:border-accent")}>
                {o}
              </button>
            ))}
            {mostrar && el !== undefined ? <p className="text-[0.84rem] text-muted">{el === q.answer ? "Correcto. " : "No. "}{q.why}</p> : null}
          </fieldset>
        );
      })}
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        {tipo === "examen" && !revelar ? <Boton onClick={() => iniciar(async () => { const r = await terminarExamen(); if (!r.ok) avisar(r.error, "error"); else router.refresh(); })}>Terminar examen</Boton> : null}
        {tipo === "examen" && revelar ? <Boton variante="secundario" onClick={() => iniciar(async () => { await repetirExamen(); router.refresh(); })}>Repetir examen</Boton> : null}
        {tipo === "quiz" && contestadas ? <Boton variante="secundario" onClick={() => iniciar(async () => { await repetirModulo(modulo!); router.refresh(); })}>Repetir quiz</Boton> : null}
        <span className="text-sm text-muted">{contestadas} de {preguntas.length} contestadas</span>
      </div>
    </div>
  );
}
