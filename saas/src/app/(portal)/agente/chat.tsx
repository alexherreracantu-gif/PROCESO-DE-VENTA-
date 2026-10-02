"use client";

import { useRef, useState } from "react";
import { Send, Square } from "lucide-react";
import { Boton, Tarjeta, cx } from "@/components/ui";
import { BotonCopiar } from "@/components/cliente";

type Mensaje = { role: "user" | "assistant"; content: string };
const EJEMPLOS = [
  "Redacta un WhatsApp para ofrecer garantía extendida y seguro de llantas a un cliente que ya firmó su King.",
  "Cliente dice que está caro el Song Plus. Respuesta en 3 líneas.",
  "¿Qué modelo le ofrezco a un chofer de app que vive en depa sin cochera?",
  "¿A quién le doy seguimiento primero hoy y qué le digo?",
];

export function Chat() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelar = useRef<AbortController | null>(null);

  async function enviar(contenido: string) {
    const t = contenido.trim();
    if (!t || ocupado) return;
    const historial: Mensaje[] = [...mensajes, { role: "user", content: t }];
    setMensajes([...historial, { role: "assistant", content: "" }]);
    setTexto(""); setError(null); setOcupado(true);
    const ctl = new AbortController(); cancelar.current = ctl;
    try {
      const r = await fetch("/api/agente", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mensajes: historial.slice(-12) }), signal: ctl.signal });
      if (!r.ok || !r.body) { setError(await r.text()); setMensajes(historial.slice(0, -1)); return; }
      const lector = r.body.getReader(), dec = new TextDecoder();
      let acumulado = "";
      for (;;) {
        const { done, value } = await lector.read();
        if (done) break;
        acumulado += dec.decode(value, { stream: true });
        setMensajes([...historial, { role: "assistant", content: acumulado }]);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError("No se pudo contactar al agente.");
    } finally {
      setOcupado(false); cancelar.current = null;
      setMensajes((m) => m.filter((x) => x.content));
    }
  }

  return (
    <>
      {!mensajes.length ? (
        <div className="flex flex-wrap gap-2">{EJEMPLOS.map((e) => <Boton key={e} variante="secundario" tamano="sm" onClick={() => enviar(e)} className="h-auto whitespace-normal py-1.5 text-left">{e}</Boton>)}</div>
      ) : null}
      <Tarjeta className="grid gap-4">
        {mensajes.length ? (
          <div className="grid gap-3" aria-live="polite">
            {mensajes.map((m, i) => (
              <div key={i} className={cx("max-w-[80ch] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[0.92rem] leading-relaxed", m.role === "user" ? "justify-self-end bg-ink text-on-ink" : "bg-surface-2")}>
                {m.content || <span className="text-muted">Pensando…</span>}
                {m.role === "assistant" && m.content && !(ocupado && i === mensajes.length - 1) ? <div className="mt-2"><BotonCopiar texto={m.content} /></div> : null}
              </div>
            ))}
          </div>
        ) : <p className="text-muted">Escribe tu pregunta o toca un ejemplo.</p>}
        <form onSubmit={(e) => { e.preventDefault(); enviar(texto); }} className="grid gap-2">
          <textarea aria-label="Pregunta para el agente" className="campo min-h-[84px]" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej. Arma el WhatsApp para Ana: Song Pro, $80,000 de enganche, quiere mensualidad menor a $9,000."
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); enviar(texto); } }} />
          <div className="flex flex-wrap items-center gap-2">
            {ocupado ? <Boton variante="secundario" icono={Square} onClick={() => cancelar.current?.abort()}>Detener</Boton> : <Boton type="submit" icono={Send} disabled={!texto.trim()}>Enviar</Boton>}
            {mensajes.length && !ocupado ? <Boton variante="fantasma" onClick={() => setMensajes([])}>Nueva conversación</Boton> : null}
            {error ? <span role="alert" className="text-sm font-semibold text-bad">{error}</span> : <span className="text-[0.78rem] text-muted">Ctrl + Enter para enviar</span>}
          </div>
        </form>
      </Tarjeta>
    </>
  );
}
