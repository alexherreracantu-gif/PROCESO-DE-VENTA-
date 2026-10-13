"use client";

import { useMemo, useState, useTransition } from "react";
import { BatteryCharging, Building2, Calculator, Check, ChevronRight, Landmark, MessageCircle, Receipt, Trees, House } from "lucide-react";
import { Boton, cx } from "@/components/ui";
import { Logo } from "@/components/marca";
import { ahorroFlotilla, MODELOS_POR_TIPO, resumenFlotilla, SUPUESTOS, TIPOS_FLOTILLA, type TipoFlotilla } from "@/lib/dominio/flotillas";
import { dinero, enlaceWhatsApp, iniciales } from "@/lib/dominio/formato";
import { enviarFlotilla } from "./acciones";

export type ModeloFlotilla = { clave: string; nombre: string; motor: "electrico" | "hibrido"; precio: number; foto: string | null; mini: string | null };
type Asesor = { usuario: string; nombre: string; corto: string; telefono: string | null; telefonoBonito: string };

const ICONO: Record<TipoFlotilla, typeof Building2> = { Empresa: Building2, Fraccionamiento: Trees, Municipio: Landmark, Desarrolladora: House };
const TEXTO_TIPO: Record<TipoFlotilla, string> = {
  Empresa: "Vendedores, supervisores, reparto y obra: cada puesto con el BYD que menos gasta para su ruta.",
  Fraccionamiento: "Rondines de vigilancia silenciosos y baratos, mantenimiento con pickup híbrida, y un Día BYD para los residentes.",
  Municipio: "Menos gasto de combustible para el erario en inspección, servicios públicos y supervisión. La agencia participa como proveedor registrado y por los procedimientos del municipio.",
  Desarrolladora: "Una promoción que vende casas («compra tu casa y estrena BYD») y la flotilla de tu equipo de ventas y obra.",
};

export function LandingFlotillas({ modelos, asesor, agencia, vigencia, avisoPrivacidad }: {
  modelos: ModeloFlotilla[]; asesor: Asesor | null; agencia: { nombre: string; ciudad: string }; vigencia: string; avisoPrivacidad: string | null;
}) {
  const [tipo, setTipo] = useState<TipoFlotilla>("Empresa");
  const [unidades, setUnidades] = useState(10);
  const [kmDia, setKmDia] = useState(100);
  const [rendimiento, setRendimiento] = useState(SUPUESTOS.rendimiento);
  const [precioGas, setPrecioGas] = useState(SUPUESTOS.precioGas);
  const a = useMemo(() => ahorroFlotilla(unidades, kmDia, { rendimiento, precioGas }), [unidades, kmDia, rendimiento, precioGas]);
  const recomendados = MODELOS_POR_TIPO[tipo].flatMap((r) => { const m = modelos.find((x) => x.clave === r.clave); return m ? [{ ...m, uso: r.uso }] : []; });
  const ir = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-dvh bg-[radial-gradient(1200px_600px_at_80%_-10%,rgba(21,144,220,0.18),transparent),linear-gradient(#f5f8fc,#eef3f9)] text-fg">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] items-center gap-3 px-4 py-2.5">
          <Logo tono="azul" ancho={118} prioridad />
          <span className="flex-1" />
          {asesor ? (
            <span className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 text-[0.8rem]">
              <span className="grid size-7 place-items-center rounded-full bg-brand font-display text-[0.8rem] font-semibold text-white">{iniciales(asesor.nombre)}</span>
              <span className="leading-tight"><span className="block text-[0.68rem] text-muted">Asesor de flotillas</span><strong>{asesor.nombre}</strong></span>
            </span>
          ) : <span className="text-[0.8rem] font-semibold text-muted">{agencia.nombre}</span>}
        </div>
      </header>

      <main className="mx-auto grid max-w-[1180px] grid-cols-[minmax(0,1fr)] gap-10 px-4 pb-24 pt-8">
        {/* Portada */}
        <section className="escalonado grid gap-4 text-center">
          <p className="eyebrow mx-auto flex items-center gap-2"><BatteryCharging className="size-3.5 text-brand" />Flotillas BYD · {agencia.ciudad}</p>
          <h1 className="mx-auto max-w-[18ch] font-display text-[2.7rem] font-semibold leading-[0.95] tracking-tight sm:text-[3.6rem]">Tu flotilla <span className="text-brand">gasta menos</span> con BYD</h1>
          <p className="mx-auto max-w-[58ch] text-[0.98rem] text-muted">Autos eléctricos e híbridos para empresas, fraccionamientos y municipios. Calcula el ahorro con tus números y recibe la propuesta en tu WhatsApp.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Boton tamano="lg" icono={Calculator} onClick={() => ir("calcular")}>Calcular mi ahorro</Boton>
            <Boton tamano="lg" variante="secundario" icono={MessageCircle} onClick={() => ir("propuesta")}>Quiero una propuesta</Boton>
          </div>
          <ul className="mx-auto mt-2 grid max-w-[900px] gap-2 text-left sm:grid-cols-3">
            {[
              ["≈10,200", "unidades vendió BYD México a flotillas en 2025¹"],
              ["Lala · Cemex · FEMSA", "algunas empresas que, según BYD, ya usan sus autos en flotilla¹"],
              ["3,000", "taxis BYD en el programa de Grupo TEC en Nuevo León²"],
            ].map(([n, t]) => (
              <li key={n} className="rounded-2xl border border-line bg-white px-4 py-3 shadow-card">
                <span className="num block text-[1.5rem] text-brand">{n}</span>
                <span className="text-[0.8rem] text-muted">{t}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Tipo de cliente */}
        <section className="grid gap-4" aria-label="Tipo de cliente">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group">
            {TIPOS_FLOTILLA.map((t) => {
              const I = ICONO[t];
              return (
                <button key={t} type="button" aria-pressed={tipo === t} onClick={() => setTipo(t)}
                  className={cx("flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-[0.9rem] font-semibold transition hover:-translate-y-0.5",
                    tipo === t ? "border-brand bg-brand text-white shadow-[0_10px_24px_-14px_var(--brand)]" : "border-line bg-white text-fg")}>
                  <I className="size-4" />{t}
                </button>
              );
            })}
          </div>
          <p key={tipo} className="aparece mx-auto max-w-[70ch] text-center text-[0.92rem] text-muted">{TEXTO_TIPO[tipo]}</p>
        </section>

        {/* Calculadora */}
        <section id="calcular" className="grid scroll-mt-20 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          <div className="grid gap-5 rounded-3xl border border-line bg-white p-5 shadow-card">
            <p className="font-display text-[1.6rem] font-semibold leading-none">Calcula tu ahorro</p>
            <Deslizador id="fl-unidades" etiqueta="Unidades" valor={unidades} min={2} max={100} paso={1} onChange={setUnidades} formato={(n) => `${n}`} />
            <Deslizador id="fl-km" etiqueta="Kilómetros por unidad al día" valor={kmDia} min={20} max={300} paso={10} onChange={setKmDia} formato={(n) => `${n} km`} />
            <details className="rounded-2xl border border-line px-4 py-3 text-[0.88rem]">
              <summary className="cursor-pointer font-semibold">Ajustar con mis datos</summary>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-[0.8rem] font-semibold text-muted">Rendimiento actual (km/l)
                  <input className="campo" type="number" inputMode="decimal" min={1} max={40} step={0.5} value={rendimiento} onChange={(e) => setRendimiento(Number(e.target.value) || 0)} />
                </label>
                <label className="grid gap-1 text-[0.8rem] font-semibold text-muted">Gasolina ($ por litro)
                  <input className="campo" type="number" inputMode="decimal" min={1} max={60} step={0.1} value={precioGas} onChange={(e) => setPrecioGas(Number(e.target.value) || 0)} />
                </label>
              </div>
            </details>
          </div>
          <div className="grid gap-3">
            <Resultado titulo="Con eléctricos" sub="Dolphin Mini" anual={a.electrico.ahorroAnual} unidadMes={a.electrico.ahorroUnidadMes} destacado />
            <Resultado titulo="Con híbridos enchufables" sub="KING, Song Pro o Shark" anual={a.hibrido.ahorroAnual} unidadMes={a.hibrido.ahorroUnidadMes} />
            <p className="text-[0.74rem] leading-relaxed text-muted">
              Estimación con supuestos de ejemplo: {SUPUESTOS.dias} días de uso al mes, electricidad a {dinero(SUPUESTOS.precioKwh)} por kWh, consumo de {SUPUESTOS.kwh100Ev} kWh por 100 km en eléctrico, {Math.round(SUPUESTOS.pctEv * 100)}% de los km del híbrido en modo eléctrico y mantenimiento estimado. Tu asesor lo confirma con tus datos reales. No es una oferta.
            </p>
          </div>
        </section>

        {/* Modelos */}
        <section className="grid gap-4" aria-label="Modelos recomendados">
          <h2 className="text-center font-display text-[2rem] font-semibold leading-none">Un BYD para cada uso</h2>
          <ul key={tipo} className="escalonado grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recomendados.map((m) => (
              <li key={m.clave + m.uso} className="overflow-hidden rounded-2xl border border-line bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="aspect-[4/3] bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- foto del modelo */}
                  {m.mini ? <img src={m.mini} alt={`BYD ${m.nombre}`} loading="lazy" className="size-full object-cover" /> : null}
                </div>
                <div className="grid gap-0.5 p-3">
                  <span className="text-[0.72rem] font-semibold uppercase tracking-wide text-brand">{m.uso}</span>
                  <strong className="text-[1rem]">BYD {m.nombre}</strong>
                  <span className="text-[0.8rem] text-muted">{m.motor === "electrico" ? "100% eléctrico" : "Híbrido enchufable"} · público {dinero(m.precio)}</span>
                  <span className="text-[0.8rem] font-semibold">Precio de flotilla: te lo cotizamos</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Beneficios */}
        <section className="grid gap-3 sm:grid-cols-3">
          {[
            { i: Calculator, t: "Menos gasto por kilómetro", d: "Electricidad en lugar de gasolina y menos mantenimiento: sin afinaciones ni cambios de aceite en los eléctricos." },
            { i: Receipt, t: tipo === "Municipio" ? "Contratación en regla" : "Deducción más alta", d: tipo === "Municipio"
              ? "Cotización formal, padrón de proveedores y procedimiento del municipio. Sin intermediarios."
              : "Hasta $250,000 deducibles por auto eléctrico o híbrido (contra $175,000), o hasta $285 diarios si es arrendamiento. Confírmalo con tu contador." },
            { i: BatteryCharging, t: "Carga sin complicaciones", d: "Los híbridos DM-i no dependen del cargador. Para eléctricos, cargador en tu estacionamiento y opción solar con Energon Solar." },
          ].map(({ i: I, t, d }) => (
            <div key={t} className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <I className="size-6 text-brand" />
              <p className="mt-2 font-semibold">{t}</p>
              <p className="text-[0.84rem] text-muted">{d}</p>
            </div>
          ))}
        </section>

        {/* Formulario */}
        <section id="propuesta" className="mx-auto w-full max-w-[560px] scroll-mt-20">
          <FormFlotilla tipo={tipo} setTipo={setTipo} unidades={unidades} kmDia={kmDia} asesor={asesor} avisoPrivacidad={avisoPrivacidad}
            foto={recomendados[0]?.foto ?? null} />
        </section>

        <footer className="grid gap-2 text-center text-[0.72rem] leading-relaxed text-muted">
          <p>Precios públicos con IVA vigentes al {vigencia}. El precio de flotilla, el crédito y el arrendamiento están sujetos a autorización de la agencia y de la institución financiera; toda tasa o mensualidad se entrega con su CAT. El ahorro es una estimación con supuestos y no constituye una oferta. Información fiscal general: la aplicación a cada caso la determina su contador. Imágenes ilustrativas.</p>
          <p>¹ Expansión, 21 de mayo de 2026, con datos de BYD México. ² El Financiero, 15 de octubre de 2025.</p>
          <p>{agencia.nombre} · {agencia.ciudad}{asesor?.telefonoBonito ? ` · WhatsApp ${asesor.telefonoBonito}` : ""}</p>
        </footer>
      </main>
    </div>
  );
}

function Deslizador({ id, etiqueta, valor, min, max, paso, onChange, formato }: { id: string; etiqueta: string; valor: number; min: number; max: number; paso: number; onChange: (n: number) => void; formato: (n: number) => string }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[0.86rem] font-semibold">{etiqueta}</label>
        <span className="num text-[1.6rem] text-brand">{formato(valor)}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={paso} value={valor} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--brand)]" />
    </div>
  );
}

function Resultado({ titulo, sub, anual, unidadMes, destacado }: { titulo: string; sub: string; anual: number; unidadMes: number; destacado?: boolean }) {
  return (
    <div className={cx("rounded-3xl p-5 shadow-card", destacado ? "bg-[linear-gradient(150deg,#0a3d7a,#0a6fb8_55%,#1590dc)] text-white" : "border border-line bg-white")}>
      <p className={cx("text-[0.78rem] font-semibold uppercase tracking-[0.12em]", destacado ? "opacity-80" : "text-muted")}>{titulo} · {sub}</p>
      <p key={Math.round(anual)} className="num aparece mt-1 text-[2.8rem] leading-none">{dinero(Math.max(0, anual))}</p>
      <p className={cx("mt-1 text-[0.84rem]", destacado ? "opacity-85" : "text-muted")}>de ahorro estimado al año · {dinero(Math.max(0, unidadMes))} por unidad al mes</p>
    </div>
  );
}

function FormFlotilla({ tipo, setTipo, unidades, kmDia, asesor, avisoPrivacidad, foto }: {
  tipo: TipoFlotilla; setTipo: (t: TipoFlotilla) => void; unidades: number; kmDia: number; asesor: Asesor | null; avisoPrivacidad: string | null; foto: string | null;
}) {
  const [cargada] = useState(() => Date.now());
  const [f, setF] = useState({ nombre: "", organizacion: "", telefono: "", correo: "", aceptaWhatsapp: false, sitio_web: "" });
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<{ telefono: string | null; asesor: string | null; whatsapp: boolean } | null>(null);
  const [ocupado, iniciar] = useTransition();
  const resumen = resumenFlotilla({ nombre: f.nombre, organizacion: f.organizacion || "mi organización", tipo, unidades, kmDia }, ahorroFlotilla(unidades, kmDia));

  function enviar() {
    setError(null);
    iniciar(async () => {
      const r = await enviarFlotilla({ ...f, tipo, unidades, kmDia, asesor: asesor?.usuario ?? null, foto, t: (Date.now() - cargada) / 1000 });
      if (!r.ok) { setError(r.error); return; }
      setListo({ telefono: r.telefono ?? asesor?.telefono ?? null, asesor: r.asesor ?? asesor?.corto ?? null, whatsapp: r.whatsapp });
    });
  }

  if (listo) {
    return (
      <div className="aparece grid gap-3 rounded-3xl border border-ok/30 bg-white p-6 text-center shadow-card">
        <span className="salta mx-auto grid size-12 place-items-center rounded-full bg-ok text-white"><Check className="size-6" strokeWidth={3} /></span>
        <p className="font-display text-[1.7rem] font-semibold leading-none">¡Listo, {f.nombre.trim().split(/\s+/)[0]}!</p>
        <p className="text-[0.92rem] text-muted">
          {listo.whatsapp ? "En un momento te llega la propuesta a tu WhatsApp. " : ""}
          {listo.asesor ? `${listo.asesor} ya tiene tus datos y te contacta hoy.` : "Un asesor de flotillas ya tiene tus datos y te contacta hoy."}
        </p>
        {listo.telefono ? (
          <a href={enlaceWhatsApp(listo.telefono, resumen.whatsapp)} target="_blank" rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-wa px-5 font-semibold text-white hover:brightness-110"><MessageCircle className="size-5" />Escribir ahora por WhatsApp</a>
        ) : null}
      </div>
    );
  }

  const valido = f.nombre.trim().length >= 2 && f.organizacion.trim().length >= 2 && f.telefono.replace(/\D/g, "").length >= 10;
  return (
    <form className="grid gap-3 rounded-3xl border border-line bg-white p-5 shadow-card" onSubmit={(e) => { e.preventDefault(); if (valido) enviar(); else setError("Escribe tu nombre, tu organización y tu WhatsApp a 10 dígitos."); }}>
      <p className="font-display text-[1.6rem] font-semibold leading-none">Recibe tu propuesta</p>
      <p className="text-[0.86rem] text-muted">{unidades} unidades · {kmDia} km por día · ahorro estimado de hasta <strong className="text-fg">{dinero(resumen.mejor)}</strong> al año.</p>
      <input name="sitio_web" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-px w-px opacity-0" value={f.sitio_web} onChange={(e) => setF({ ...f, sitio_web: e.target.value })} />
      <label className="grid gap-1 text-[0.82rem] font-semibold text-muted">Tu nombre
        <input className="campo" autoComplete="name" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Nombre y apellido" />
      </label>
      <label className="grid gap-1 text-[0.82rem] font-semibold text-muted">{tipo === "Municipio" ? "Municipio y área" : tipo === "Fraccionamiento" ? "Fraccionamiento" : "Empresa"}
        <input className="campo" autoComplete="organization" value={f.organizacion} onChange={(e) => setF({ ...f, organizacion: e.target.value })} placeholder={tipo === "Municipio" ? "Ej. Municipio de García, Servicios Públicos" : "Nombre"} />
      </label>
      <label className="grid gap-1 text-[0.82rem] font-semibold text-muted">Tipo
        <select className="campo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoFlotilla)}>
          {TIPOS_FLOTILLA.map((t) => <option key={t}>{t}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-[0.82rem] font-semibold text-muted">WhatsApp
          <input className="campo" type="tel" inputMode="tel" autoComplete="tel" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} placeholder="10 dígitos" />
        </label>
        <label className="grid gap-1 text-[0.82rem] font-semibold text-muted">Correo (opcional)
          <input className="campo" type="email" inputMode="email" autoComplete="email" value={f.correo} onChange={(e) => setF({ ...f, correo: e.target.value })} placeholder="nombre@empresa.mx" />
        </label>
      </div>
      <label className="flex items-start gap-2.5 rounded-2xl border border-line px-3 py-2.5 text-[0.86rem]">
        <input type="checkbox" className="mt-0.5 size-4 accent-[var(--brand)]" checked={f.aceptaWhatsapp} onChange={(e) => setF({ ...f, aceptaWhatsapp: e.target.checked })} />
        <span>Quiero recibir la propuesta y su seguimiento por WhatsApp.</span>
      </label>
      {error ? <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-[0.84rem] font-semibold text-bad">{error}</p> : null}
      <Boton type="submit" tamano="lg" icono={ocupado ? undefined : ChevronRight} disabled={ocupado} className="w-full">{ocupado ? "Enviando…" : "Quiero mi propuesta"}</Boton>
      <p className="text-center text-[0.7rem] text-muted">
        Usamos tus datos solo para preparar tu propuesta y darte seguimiento.{" "}
        {avisoPrivacidad ? <a href={avisoPrivacidad} target="_blank" rel="noopener noreferrer" className="underline">Aviso de privacidad</a> : "Consulta nuestro aviso de privacidad en la agencia."}
      </p>
    </form>
  );
}
