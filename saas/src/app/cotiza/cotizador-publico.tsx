"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { BadgePercent, Check, ChevronRight, MessageCircle, Printer, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Boton, cx } from "@/components/ui";
import { Logo } from "@/components/marca";
import { cotizar, PLAZOS } from "@/lib/dominio/banorte";
import { dinero, dinero2, enlaceWhatsApp, iniciales } from "@/lib/dominio/formato";
import { enviarCotizacion } from "./acciones";

export type ModeloPublico = {
  id: string; clave: string; nombre: string; anio: number; motor: "electrico" | "hibrido"; precio: number; bono: number;
  autonomia: string; mensualidadDesde: number | null; tasaDesde: number | null; foto: string | null; mini: string | null;
};
type Asesor = { usuario: string; nombre: string; corto: string; telefono: string | null; telefonoBonito: string };

const CUANDO = ["Este mes", "En 1 a 3 meses", "Solo estoy viendo"] as const;
const redondear = (n: number, paso = 5000) => Math.round(n / paso) * paso;
const pctTxt = (t: number) => `${(t * 100).toFixed(2).replace(/\.?0+$/, "")}%`;

export function CotizadorPublico({ modelos, inicial, parametros, asesor, agencia, vigencia }: {
  modelos: ModeloPublico[]; inicial: string; parametros: { garantia: number; placasElectrico: number; placasHibrido: number };
  asesor: Asesor | null; agencia: { nombre: string; ciudad: string }; vigencia: string;
}) {
  const [clave, setClave] = useState(inicial);
  const m = modelos.find((x) => x.clave === clave) ?? modelos[0];
  const minimo = (x: ModeloPublico) => Math.max(10000, redondear(x.precio * 0.05 - x.bono));
  const sugerido = (x: ModeloPublico) => Math.max(minimo(x), redondear(x.precio * 0.2 - x.bono));
  const [contado, setContado] = useState(false);
  const [aportacion, setAportacion] = useState(() => sugerido(m));
  const [plazo, setPlazo] = useState(60);
  const [garantia, setGarantia] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  function elegir(c: string) {
    const n = modelos.find((x) => x.clave === c);
    if (!n) return;
    setClave(c);
    setAportacion(sugerido(n));
    document.getElementById("configurar")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const placas = m.motor === "electrico" ? parametros.placasElectrico : parametros.placasHibrido;
  const maximo = redondear(m.precio * 0.7);
  const ap = Math.min(Math.max(aportacion, minimo(m)), maximo);
  const r = useMemo(() => {
    const base = { modelo: m, accesorios: 0, garantia: garantia ? parametros.garantia : 0, plazo, placas, tramites: 0 };
    const q = cotizar({ ...base, aportacion: ap });
    const plazos = PLAZOS.filter((n) => n >= 24).map((n) => ({ n, m: cotizar({ ...base, aportacion: ap, plazo: n }).mensualidad }));
    // ¿Cuánto más para el siguiente escalón de tasa?
    const escalon = [0.2, 0.25, 0.4, 0.5].find((e) => e > q.pctEnganche + 0.0001);
    let mejora: { aportacion: number; tasa: number; mensualidad: number } | null = null;
    if (escalon) {
      const apSig = Math.ceil((escalon * q.base - q.bono) / 1000) * 1000;
      if (apSig <= maximo) {
        const q2 = cotizar({ ...base, aportacion: apSig });
        if (q2.convenio.tasa < q.convenio.tasa) mejora = { aportacion: apSig, tasa: q2.convenio.tasa, mensualidad: q2.mensualidad };
      }
    }
    return { q, plazos, mejora };
  }, [m, ap, plazo, garantia, parametros.garantia, placas, maximo]);
  const { q } = r;
  const totalContado = m.precio + (garantia ? parametros.garantia : 0) + placas;

  return (
    <div className="min-h-dvh bg-[radial-gradient(1200px_600px_at_80%_-10%,rgba(21,144,220,0.18),transparent),linear-gradient(#f5f8fc,#eef3f9)] text-fg">
      {/* Barra superior */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-white/85 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-[1180px] items-center gap-3 px-4 py-2.5">
          <Logo tono="azul" ancho={118} prioridad />
          <span className="flex-1" />
          {asesor ? (
            <span className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 text-[0.8rem]">
              <span className="grid size-7 place-items-center rounded-full bg-brand font-display text-[0.8rem] font-semibold text-white">{iniciales(asesor.nombre)}</span>
              <span className="leading-tight"><span className="block text-[0.68rem] text-muted">Te atiende</span><strong>{asesor.nombre}</strong></span>
            </span>
          ) : <span className="text-[0.8rem] font-semibold text-muted">{agencia.nombre}</span>}
        </div>
      </header>

      <main className="mx-auto grid max-w-[1180px] grid-cols-[minmax(0,1fr)] gap-8 px-4 pb-24 pt-8 print:hidden">
        {/* Portada */}
        <section className="escalonado grid gap-3 text-center">
          <p className="eyebrow mx-auto flex items-center gap-2"><Sparkles className="size-3.5 text-brand" />Oferta vigente al {vigencia}</p>
          <h1 className="font-display text-[2.6rem] font-semibold leading-[0.95] tracking-tight sm:text-[3.4rem]">Calcula tu mensualidad <span className="text-brand">en 1 minuto</span></h1>
          <p className="mx-auto max-w-[56ch] text-[0.98rem] text-muted">Elige tu BYD, mueve el enganche y el plazo, y recibe tu cotización por WhatsApp. Precios con IVA y bono flexible del mes ya incluidos.</p>
        </section>

        {/* Modelos */}
        <section aria-label="Modelos" className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
          <ul className="flex snap-x gap-3">
            {modelos.map((x) => (
              <li key={x.clave} className="snap-start">
                <button type="button" onClick={() => elegir(x.clave)} aria-pressed={x.clave === clave}
                  className={cx("grid w-[190px] gap-1.5 rounded-2xl border bg-white p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-lg",
                    x.clave === clave ? "border-brand shadow-[0_0_0_2px_var(--brand)]" : "border-line")}>
                  <span className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-surface-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- miniatura del modelo */}
                    {x.mini ? <img src={x.mini} alt={`BYD ${x.nombre}`} loading="lazy" className="size-full object-cover" /> : null}
                    {x.bono ? <span className="absolute left-1.5 top-1.5 rounded-full bg-brand px-2 py-0.5 text-[0.66rem] font-bold text-white">Bono {dinero(x.bono)}</span> : null}
                  </span>
                  <span className="px-0.5">
                    <strong className="block truncate text-[0.92rem]">{x.nombre}</strong>
                    <span className="block text-[0.74rem] text-muted">{x.motor === "electrico" ? "Eléctrico" : "Híbrido"} · {dinero(x.precio)}</span>
                    {x.mensualidadDesde ? <span className="mt-0.5 block text-[0.78rem] font-semibold text-brand">Desde {dinero(x.mensualidadDesde)}/mes*</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Configurador + resultado */}
        <section id="configurar" className="grid scroll-mt-20 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
          <div className="grid gap-5">
            <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-card">
              <div className="relative aspect-[16/9] bg-[linear-gradient(135deg,#0a3d7a,#1590dc)]">
                {/* eslint-disable-next-line @next/next/no-img-element -- foto del modelo */}
                {m.foto ? <img key={m.foto} src={m.foto} alt={`BYD ${m.nombre}`} className="aparece size-full object-cover" /> : null}
                <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(5,20,45,0.85))] px-5 pb-4 pt-12 text-white">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] opacity-80">{m.motor === "electrico" ? "100% eléctrico" : "Híbrido enchufable"}{m.autonomia ? ` · ${m.autonomia.replace(/\*$/, "")}` : ""}</p>
                  <h2 className="font-display text-[2.1rem] font-semibold leading-none">BYD {m.nombre} {m.anio}</h2>
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-line text-center">
                <Dato k="Precio" v={dinero(m.precio)} />
                <Dato k="Bono flexible" v={m.bono ? dinero(m.bono) : "—"} acento={!!m.bono} />
                <Dato k="Tasa desde" v={m.tasaDesde ? pctTxt(m.tasaDesde) : "7.88%"} />
              </div>
            </div>

            <div className="grid gap-5 rounded-3xl border border-line bg-white p-5 shadow-card">
              <div className="inline-flex w-full rounded-2xl bg-surface-2 p-1" role="group" aria-label="Forma de pago">
                {[["Financiado", false], ["De contado", true]].map(([t, v]) => (
                  <button key={String(t)} type="button" aria-pressed={contado === v} onClick={() => setContado(v as boolean)}
                    className={cx("flex-1 rounded-xl py-2.5 text-[0.9rem] font-semibold transition", contado === v ? "bg-white shadow-sm" : "text-muted")}>{t as string}</button>
                ))}
              </div>

              {!contado ? (
                <>
                  <div className="grid gap-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <label htmlFor="cp-eng" className="text-[0.86rem] font-semibold">¿Cuánto das de enganche?</label>
                      <span className="num text-[1.6rem] text-brand">{dinero(ap)}</span>
                    </div>
                    <input id="cp-eng" type="range" min={minimo(m)} max={maximo} step={5000} value={ap} onChange={(e) => setAportacion(Number(e.target.value))} className="w-full accent-[var(--brand)]" />
                    <p className="text-[0.8rem] text-muted">
                      {q.bonoAplica ? <>+ <strong className="text-fg">{dinero(q.bono)}</strong> de bono = enganche total de <strong className="text-fg">{dinero(q.enganche)}</strong> ({Math.round(q.pctEnganche * 100)}%)</> : <>Enganche del {Math.round(q.pctEnganche * 100)}%</>}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <span className="text-[0.86rem] font-semibold">Plazo</span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {r.plazos.map((p) => (
                        <button key={p.n} type="button" onClick={() => setPlazo(p.n)} aria-pressed={plazo === p.n}
                          className={cx("rounded-xl border px-1 py-2 text-center transition", plazo === p.n ? "border-brand bg-brand text-white" : "border-line hover:border-subtle")}>
                          <span className="block text-[0.7rem] opacity-80">{p.n} m</span>
                          <span className="block text-[0.78rem] font-semibold tabular-nums">{dinero(p.m)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="rounded-2xl bg-warn-soft px-4 py-3 text-[0.86rem]">
                  De contado se factura a precio lleno.{m.bono ? <> Si financias desde 5% de enganche recibes <strong>{dinero(m.bono)} de bono</strong>: a veces sale más barato financiar el mínimo. <button type="button" onClick={() => setContado(false)} className="font-semibold text-accent underline">Ver financiado</button></> : null}
                </p>
              )}
              <label className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 text-[0.88rem]">
                <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={garantia} onChange={(e) => setGarantia(e.target.checked)} />
                <span className="flex-1"><strong>Garantía extendida a 6 años</strong><span className="block text-[0.78rem] text-muted">Kilometraje ilimitado · {dinero(parametros.garantia)}{contado ? "" : ", se incluye en tu mensualidad"}</span></span>
                <ShieldCheck className="size-5 text-brand" />
              </label>
            </div>
          </div>

          {/* Resultado */}
          <aside className="grid gap-4 lg:sticky lg:top-20">
            <div className="overflow-hidden rounded-3xl bg-[linear-gradient(150deg,#0a3d7a,#0a6fb8_55%,#1590dc)] p-6 text-white shadow-[0_24px_60px_-28px_rgba(10,61,122,0.7)]">
              {contado ? (
                <>
                  <p className="text-[0.8rem] font-semibold uppercase tracking-[0.12em] opacity-80">Total de contado</p>
                  <p className="num mt-1 text-[3.2rem] leading-none">{dinero(totalContado)}</p>
                  <ul className="mt-4 grid gap-1.5 text-[0.86rem] opacity-90">
                    <Fila k="Precio con IVA" v={dinero(m.precio)} />
                    {garantia ? <Fila k="Garantía extendida" v={dinero(parametros.garantia)} /> : null}
                    <Fila k="Placas Nuevo León (aprox.)" v={dinero(placas)} />
                  </ul>
                </>
              ) : (
                <>
                  <p className="text-[0.8rem] font-semibold uppercase tracking-[0.12em] opacity-80">Tu mensualidad a {plazo} meses</p>
                  <p key={`${clave}-${ap}-${plazo}-${garantia}`} className="num aparece mt-1 text-[3.4rem] leading-none">{dinero2(q.mensualidad)}</p>
                  <p className="mt-1 text-[0.84rem] opacity-85">Tasa fija anual de {pctTxt(q.convenio.tasa)}</p>
                  <ul className="mt-4 grid gap-1.5 text-[0.86rem] opacity-90">
                    <Fila k="Tu enganche" v={dinero(ap)} />
                    {q.bonoAplica ? <Fila k="Bono BYD" v={`+ ${dinero(q.bono)}`} /> : null}
                    <Fila k="Monto a financiar" v={dinero(q.monto)} />
                    <Fila k="Pago aprox. a la firma" v={dinero(q.pagoFirma)} fuerte />
                  </ul>
                </>
              )}
              <Boton variante="secundario" tamano="lg" icono={MessageCircle} className="mt-5 w-full border-transparent text-[#0a3d7a]"
                onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}>
                Recibir mi cotización
              </Boton>
            </div>
            {!contado && r.mejora ? (
              <p className="flex gap-3 rounded-2xl border border-ok/30 bg-ok-soft px-4 py-3 text-[0.86rem]">
                <BadgePercent className="mt-0.5 size-5 shrink-0 text-ok" />
                <span>Si das <strong>{dinero(r.mejora.aportacion)}</strong> de enganche, tu tasa baja a <strong>{pctTxt(r.mejora.tasa)}</strong> y pagas <strong>{dinero2(r.mejora.mensualidad)}</strong> al mes.
                  <button type="button" onClick={() => setAportacion(r.mejora!.aportacion)} className="ml-1 font-semibold text-accent underline">Aplicar</button></span>
              </p>
            ) : null}
            <div ref={formRef}>
              <FormCotizacion modelo={m} contado={contado} aportacion={ap} plazo={plazo} garantia={garantia} mensualidad={q.mensualidad} tasa={q.convenio.tasa}
                bono={q.bonoAplica ? q.bono : 0} totalContado={totalContado} asesor={asesor} />
            </div>
          </aside>
        </section>

        {/* Por qué BYD Grupo TEC */}
        <section className="grid gap-3 sm:grid-cols-3">
          {[
            { i: BadgePercent, t: "Bono flexible", d: "Financiando con BBVA, Santander, Banorte o KUNA desde 5% de enganche." },
            { i: Zap, t: "Tasa desde 7.88%", d: "Con 50% de enganche. Te armamos el plan que mejor te queda." },
            { i: ShieldCheck, t: "Respaldo de agencia", d: "Prueba de manejo, entrega personalizada y servicio en Grupo TEC." },
          ].map(({ i: I, t, d }) => (
            <div key={t} className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <I className="size-6 text-brand" />
              <p className="mt-2 font-semibold">{t}</p>
              <p className="text-[0.84rem] text-muted">{d}</p>
            </div>
          ))}
        </section>

        <footer className="grid gap-2 text-center text-[0.72rem] leading-relaxed text-muted">
          <p>Cotización informativa calculada con Banorte Plan Tradicional; sujeta a aprobación de crédito. Mensualidad sin seguros de auto y de vida; el pago a la firma incluye comisión por apertura y placas. Precios con IVA. El bono flexible aplica financiando desde 5% de enganche con las instituciones participantes; de contado aplica precio lleno. Vigencia al {vigencia} o hasta agotar existencias. Imágenes ilustrativas.</p>
          <p>{agencia.nombre} · {agencia.ciudad}{asesor?.telefonoBonito ? ` · WhatsApp ${asesor.telefonoBonito}` : ""}</p>
        </footer>
      </main>

      {/* Versión para imprimir o guardar en PDF */}
      <div className="hidden p-8 print:block">
        <Logo tono="azul" ancho={150} />
        <h1 className="mt-4 font-display text-[2rem] font-semibold">Cotización BYD {m.nombre} {m.anio}</h1>
        <p className="text-[0.9rem]">{contado ? `De contado: ${dinero(totalContado)}` : `Mensualidad ${dinero2(q.mensualidad)} a ${plazo} meses · tasa ${pctTxt(q.convenio.tasa)} · enganche ${dinero(ap)}${q.bonoAplica ? ` + bono ${dinero(q.bono)}` : ""} · pago aprox. a la firma ${dinero(q.pagoFirma)}`}</p>
        <p className="mt-2 text-[0.85rem]">{asesor ? `Tu asesor: ${asesor.nombre}${asesor.telefonoBonito ? ` · WhatsApp ${asesor.telefonoBonito}` : ""}` : agencia.nombre}</p>
        <p className="mt-4 text-[0.7rem]">Sujeto a aprobación de crédito. Precios con IVA. Vigencia al {vigencia}.</p>
      </div>
    </div>
  );
}

function Dato({ k, v, acento }: { k: string; v: string; acento?: boolean }) {
  return <div className="px-2 py-3"><p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted">{k}</p><p className={cx("text-[1.02rem] font-semibold tabular-nums", acento && "text-brand")}>{v}</p></div>;
}
function Fila({ k, v, fuerte }: { k: string; v: string; fuerte?: boolean }) {
  return <li className="flex justify-between gap-3"><span>{k}</span><span className={cx("tabular-nums", fuerte && "font-semibold")}>{v}</span></li>;
}

function FormCotizacion({ modelo, contado, aportacion, plazo, garantia, mensualidad, tasa, bono, totalContado, asesor }: {
  modelo: ModeloPublico; contado: boolean; aportacion: number; plazo: number; garantia: boolean; mensualidad: number; tasa: number; bono: number; totalContado: number;
  asesor: Asesor | null;
}) {
  const [cargada] = useState(() => Date.now());
  const [f, setF] = useState({ nombre: "", telefono: "", cuando: "Este mes" as (typeof CUANDO)[number], toma: false, sitio_web: "" });
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<{ telefono: string | null; asesor: string | null } | null>(null);
  const [ocupado, iniciar] = useTransition();
  const mensaje = [
    `Hola${listo?.asesor ? ` ${listo.asesor}` : ""}, soy ${f.nombre.trim().split(/\s+/)[0] || "cliente"}. Coticé un BYD ${modelo.nombre} ${modelo.anio}:`,
    contado ? `De contado: ${dinero(totalContado)}` : `Enganche ${dinero(aportacion)}${bono ? ` + bono ${dinero(bono)}` : ""}, ${plazo} meses, mensualidad aprox. ${dinero2(mensualidad)} (tasa ${pctTxt(tasa)})${garantia ? ", con garantía extendida" : ""}.`,
    `Me interesa: ${f.cuando.toLowerCase()}.${f.toma ? " Tengo auto a cuenta." : ""}`,
  ].join("\n");

  function enviar() {
    setError(null);
    iniciar(async () => {
      const r = await enviarCotizacion({ ...f, modeloId: modelo.id, contado, aportacion, plazo, garantia, asesor: asesor?.usuario ?? null, t: (Date.now() - cargada) / 1000 });
      if (!r.ok) { setError(r.error); return; }
      setListo({ telefono: r.telefono ?? asesor?.telefono ?? null, asesor: r.asesor ?? asesor?.corto ?? null });
    });
  }

  if (listo) {
    return (
      <div className="aparece grid gap-3 rounded-3xl border border-ok/30 bg-white p-5 text-center shadow-card">
        <span className="salta mx-auto grid size-12 place-items-center rounded-full bg-ok text-white"><Check className="size-6" strokeWidth={3} /></span>
        <p className="font-display text-[1.6rem] font-semibold leading-none">¡Listo, {f.nombre.trim().split(/\s+/)[0]}!</p>
        <p className="text-[0.9rem] text-muted">{listo.asesor ? `${listo.asesor} ya tiene tu cotización y te escribe en minutos.` : "Un asesor ya tiene tu cotización y te escribe en minutos."} Si prefieres, escríbele tú:</p>
        {listo.telefono ? (
          <a href={enlaceWhatsApp(listo.telefono, mensaje)} target="_blank" rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-wa px-5 font-semibold text-white hover:brightness-110"><MessageCircle className="size-5" />Escribir por WhatsApp</a>
        ) : null}
        <Boton variante="secundario" icono={Printer} onClick={() => window.print()}>Guardar mi cotización (PDF)</Boton>
      </div>
    );
  }

  const valido = f.nombre.trim().length >= 2 && f.telefono.replace(/\D/g, "").length >= 10;
  return (
    <form className="grid gap-3 rounded-3xl border border-line bg-white p-5 shadow-card" onSubmit={(e) => { e.preventDefault(); if (valido) enviar(); else setError("Escribe tu nombre y tu WhatsApp a 10 dígitos."); }}>
      <p className="font-semibold">Recibe tu cotización por WhatsApp</p>
      <input name="sitio_web" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-px w-px opacity-0" value={f.sitio_web} onChange={(e) => setF({ ...f, sitio_web: e.target.value })} />
      <label className="grid gap-1 text-[0.82rem] font-semibold text-muted">Nombre
        <input className="campo" autoComplete="name" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Tu nombre y apellido" />
      </label>
      <label className="grid gap-1 text-[0.82rem] font-semibold text-muted">WhatsApp
        <input className="campo" type="tel" inputMode="tel" autoComplete="tel" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} placeholder="10 dígitos" />
      </label>
      <div className="grid gap-1">
        <span className="text-[0.82rem] font-semibold text-muted">¿Cuándo te gustaría estrenar?</span>
        <div className="grid grid-cols-3 gap-1.5">
          {CUANDO.map((c) => (
            <button key={c} type="button" aria-pressed={f.cuando === c} onClick={() => setF({ ...f, cuando: c })}
              className={cx("rounded-xl border px-2 py-2 text-[0.78rem] font-semibold transition", f.cuando === c ? "border-brand bg-accent-soft text-brand" : "border-line text-muted")}>{c}</button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2.5 text-[0.86rem]"><input type="checkbox" className="size-4 accent-[var(--brand)]" checked={f.toma} onChange={(e) => setF({ ...f, toma: e.target.checked })} />Tengo un auto para dejar a cuenta</label>
      {error ? <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-[0.84rem] font-semibold text-bad">{error}</p> : null}
      <Boton type="submit" tamano="lg" icono={ocupado ? undefined : ChevronRight} disabled={ocupado} className="w-full">{ocupado ? "Enviando…" : "Enviar mi cotización"}</Boton>
      <p className="text-center text-[0.7rem] text-muted">Usamos tus datos solo para darte seguimiento a esta cotización. No compartimos tu información.</p>
    </form>
  );
}
