"use client";

import { useMemo, useState } from "react";
import { BotonCopiar } from "@/components/cliente";
import { BotonEnlace, Campo, Pastilla, Tarjeta, TituloTarjeta, cx } from "@/components/ui";
import { aportacionParaPagoFirma, cotizar, PLAZOS } from "@/lib/dominio/banorte";
import { dinero, dinero2, enlaceWhatsApp } from "@/lib/dominio/formato";

type ModeloC = { id: string; clave: string; nombre: string; anio: number; motor: "electrico" | "hibrido"; precio: number; bono: number; descripcion: string | null };
type Parametros = { placasElectrico: number; placasHibrido: number; gestoria: number; garantia: number; separacion: number };

export function Cotizador({ modelos, parametros, asesor }: { modelos: ModeloC[]; parametros: Parametros; asesor: string }) {
  const [modeloId, setModeloId] = useState(modelos.find((m) => m.clave.startsWith("king-gl"))?.id ?? modelos[0]?.id ?? "");
  const [modo, setModo] = useState<"aportacion" | "firma">("aportacion");
  const [aportacion, setAportacion] = useState("50000");
  const [firma, setFirma] = useState("80000");
  const [accesorios, setAccesorios] = useState("0");
  const [plazo, setPlazo] = useState(72);
  const [garantia, setGarantia] = useState(false);
  const [gestoria, setGestoria] = useState(false);
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const modelo = modelos.find((m) => m.id === modeloId);

  const r = useMemo(() => {
    if (!modelo) return null;
    const base = { modelo, accesorios: Number(accesorios) || 0, garantia: garantia ? parametros.garantia : 0, plazo, placas: modelo.motor === "electrico" ? parametros.placasElectrico : parametros.placasHibrido, tramites: gestoria ? parametros.gestoria : 0 };
    const ap = modo === "firma" ? aportacionParaPagoFirma(base, Number(firma) || 0) : Number(aportacion) || 0;
    const q = cotizar({ ...base, aportacion: ap });
    const escenarios = PLAZOS.filter((n) => n >= 36).map((n) => ({ n, m: cotizar({ ...base, aportacion: ap, plazo: n }).mensualidad }));
    // Siguiente escalón de tasa si está cerca.
    const escalones = [0.2, 0.25, 0.4, 0.5].filter((e) => e > q.pctEnganche && e - q.pctEnganche <= 0.1);
    const sig = escalones[0];
    let mejora: { aportacion: number; mensualidad: number; tasa: number } | null = null;
    if (sig && q.base > 0) {
      const apSig = Math.ceil(sig * q.base - q.bono);
      const q2 = cotizar({ ...base, aportacion: apSig });
      if (q2.convenio.tasa < q.convenio.tasa) mejora = { aportacion: apSig, mensualidad: q2.mensualidad, tasa: q2.convenio.tasa };
    }
    return { q, ap, base, escenarios, mejora };
  }, [modelo, accesorios, garantia, plazo, gestoria, modo, firma, aportacion, parametros]);

  if (!modelo || !r) return <p className="text-muted">No hay modelos activos en el catálogo.</p>;
  const { q } = r;
  const primerNombre = cliente.trim().split(" ")[0];
  const wa = [
    primerNombre ? `Hola ${primerNombre}, te comparto tu cotización:` : null,
    `🚗 BYD ${modelo.nombre} ${modelo.anio}`,
    `Enganche: ${dinero(r.ap)}${q.bonoAplica ? ` + ${dinero(q.bono)} de bono = ${dinero(q.enganche)}` : ""}`,
    `Mensualidad aprox.: ${dinero2(q.mensualidad)} a ${plazo} meses`,
    `Tasa fija anual: ${(q.convenio.tasa * 100).toFixed(2)}% (Banorte ${q.convenio.nombre})`,
    `Pago a la firma aprox.: ${dinero2(q.pagoFirma)}`,
    garantia ? "Incluye garantía extendida de 6 años." : null,
    `Sujeto a autorización de crédito. ${asesor} · BYD Park Point`,
  ].filter(Boolean).join("\n");
  const fila = (k: string, v: string, fuerte?: boolean) => <div className="flex justify-between gap-4 text-[0.9rem]"><span className="text-muted">{k}</span><span className={cx("text-right tabular-nums", fuerte && "font-semibold")}>{v}</span></div>;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <Tarjeta className="grid h-fit gap-4">
        <Campo etiqueta="Modelo" htmlFor="c-modelo">
          <select id="c-modelo" className="campo" value={modeloId} onChange={(e) => setModeloId(e.target.value)}>
            {modelos.map((m) => <option key={m.id} value={m.id}>{m.nombre} {m.anio} · {dinero(m.precio)}</option>)}
          </select>
        </Campo>
        <p className="rounded-xl bg-accent-soft px-4 py-3 text-[0.88rem]"><strong>{modelo.motor === "electrico" ? "Eléctrico" : "Híbrido"}</strong>{modelo.bono ? ` · bono ${dinero(modelo.bono)} financiando` : " · sin bono este mes"}{modelo.descripcion ? ` · ${modelo.descripcion}` : ""}
          <a href={`/fotos#${modelo.clave}`} className="mt-1 inline-block py-1.5 font-semibold text-accent hover:underline">Ver y enviar fotos del {modelo.nombre} →</a></p>
        <div className="inline-flex w-fit rounded-xl bg-surface-2 p-1" role="group" aria-label="Cómo calcular">
          {([["aportacion", "Cliente aporta"], ["firma", "Quiere pagar a la firma"]] as const).map(([v, t]) => (
            <button key={v} type="button" aria-pressed={modo === v} onClick={() => setModo(v)} className={cx("rounded-lg px-3 py-1.5 text-[0.84rem] font-semibold", modo === v ? "bg-surface shadow-sm" : "text-muted")}>{t}</button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {modo === "aportacion" ? (
            <Campo etiqueta="Aportación del cliente" htmlFor="c-aport" ayuda="Sin contar el bono."><input id="c-aport" type="number" min={0} step={1000} inputMode="decimal" className="campo" value={aportacion} onChange={(e) => setAportacion(e.target.value)} /></Campo>
          ) : (
            <Campo etiqueta="Pago a la firma deseado" htmlFor="c-firma" ayuda={`Aporta ${dinero(r.ap)}`}><input id="c-firma" type="number" min={0} step={1000} inputMode="decimal" className="campo" value={firma} onChange={(e) => setFirma(e.target.value)} /></Campo>
          )}
          <Campo etiqueta="Accesorios" htmlFor="c-acc"><input id="c-acc" type="number" min={0} step={500} inputMode="decimal" className="campo" value={accesorios} onChange={(e) => setAccesorios(e.target.value)} /></Campo>
          <Campo etiqueta="Plazo" htmlFor="c-plazo"><select id="c-plazo" className="campo" value={plazo} onChange={(e) => setPlazo(Number(e.target.value))}>{PLAZOS.map((n) => <option key={n} value={n}>{n} meses</option>)}</select></Campo>
          <Campo etiqueta="Cliente" htmlFor="c-cliente"><input id="c-cliente" className="campo" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Opcional" /></Campo>
        </div>
        <div className="grid gap-2">
          <label className="inline-flex items-center gap-2.5 text-[0.9rem]"><input type="checkbox" className="size-4 accent-[var(--accent)]" checked={garantia} onChange={(e) => setGarantia(e.target.checked)} />Garantía extendida financiada ({dinero(parametros.garantia)})</label>
          <label className="inline-flex items-center gap-2.5 text-[0.9rem]"><input type="checkbox" className="size-4 accent-[var(--accent)]" checked={gestoria} onChange={(e) => setGestoria(e.target.checked)} />Gestoría de placas ({dinero(parametros.gestoria)})</label>
        </div>
        <Campo etiqueta="WhatsApp del cliente" htmlFor="c-tel"><input id="c-tel" type="tel" className="campo" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="10 dígitos (opcional)" /></Campo>
      </Tarjeta>

      <Tarjeta className="grid h-fit gap-2.5">
        <TituloTarjeta titulo="Hoja de números"><Pastilla tono="warn">Borrador</Pastilla></TituloTarjeta>
        {fila("Precio de lista", dinero(modelo.precio))}
        {fila("Bono flexible", q.bonoAplica ? dinero(q.bono) : modelo.bono ? "No aplica (menos de 5%)" : "Sin bono")}
        {fila("Enganche (aportación + bono)", dinero(q.enganche))}
        {fila("% de enganche", `${(q.pctEnganche * 100).toFixed(1)}%`)}
        {fila("Convenio", `${q.convenio.nombre} · ${(q.convenio.tasa * 100).toFixed(2)}%`)}
        {fila("Monto a financiar", dinero2(q.monto))}
        {fila("Comisión (× 1.16)", dinero2(q.comision))}
        {fila("Placas Monterrey", dinero(r.base.placas))}
        <div className="mt-1 grid gap-1 rounded-xl bg-surface-2 p-4">
          <span className="text-[0.8rem] text-muted">Mensualidad a {plazo} meses</span>
          <span className="num text-[2.8rem]">{dinero2(q.mensualidad)}</span>
          <span className="text-[0.82rem] text-muted">Pago a la firma (sin seguro de auto y vida): <strong className="text-fg">{dinero2(q.pagoFirma)}</strong></span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {r.escenarios.map((e) => (
            <button key={e.n} type="button" onClick={() => setPlazo(e.n)} className={cx("rounded-xl border px-2 py-2 transition", e.n === plazo ? "border-accent bg-accent text-on-accent" : "border-line hover:border-subtle")}>
              <span className="block text-[0.72rem] opacity-80">{e.n} meses</span><span className="block text-[0.86rem] font-semibold tabular-nums">{dinero(e.m)}</span>
            </button>
          ))}
        </div>
        {r.mejora ? (
          <p className="rounded-xl bg-ok-soft px-4 py-3 text-[0.86rem]">Si aporta <strong>{dinero(r.mejora.aportacion)}</strong> baja a <strong>{(r.mejora.tasa * 100).toFixed(2)}%</strong>: mensualidad de <strong>{dinero2(r.mejora.mensualidad)}</strong> ({dinero(q.mensualidad - r.mejora.mensualidad)} menos al mes).</p>
        ) : null}
        {q.pctEnganche < 0.4 ? <p className="text-[0.8rem] text-warn">Enganche menor a 40%: el sistema calcula, pero las condiciones las autoriza el banco.</p> : null}
        <pre className="mt-1 whitespace-pre-wrap rounded-xl bg-bg p-3.5 font-mono text-[0.78rem] leading-relaxed text-muted">{wa}</pre>
        <div className="flex flex-wrap gap-2">
          <BotonCopiar texto={wa} etiqueta="Copiar WhatsApp" mensaje="Mensaje copiado" variante="primario" tamano="md" />
          <BotonEnlace variante="whatsapp" externo href={enlaceWhatsApp(telefono, wa)}>Abrir WhatsApp</BotonEnlace>
        </div>
      </Tarjeta>
    </div>
  );
}
