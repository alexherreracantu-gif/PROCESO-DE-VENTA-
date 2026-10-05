"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download, Share2 } from "lucide-react";
import { Boton, Campo, Tarjeta, TituloTarjeta, cx } from "@/components/ui";
import { BotonCopiar, descargarArchivo, useAviso } from "@/components/cliente";
import { FORMATOS, cargarImagen, cargarRecursosAnuncio, dibujarAnuncio, type Estilo, type Formato, type Recursos } from "@/components/anuncios/dibujar";
import { autonomiaDe, escenario, telefonoBonito, textoLegal, textosAnuncio, type ModeloAnuncio } from "@/lib/anuncios";
import { PLAZOS } from "@/lib/dominio/banorte";
import { MESES } from "@/lib/dominio/fechas";
import { dinero } from "@/lib/dominio/formato";
import { POSICIONES, fuenteFoto, type FotosModelo } from "@/lib/fotos";

export type ModeloGenerador = ModeloAnuncio & FotosModelo;

const ESTILOS: { valor: Estilo; texto: string; ayuda: string }[] = [
  { valor: "campana", texto: "Campaña", ayuda: "Como los anuncios oficiales: mensualidad arriba, bono y tasa abajo, modelo a la derecha" },
  { valor: "bono", texto: "Bono", ayuda: "Pestaña con el bono, franja con tasa y mensualidad" },
  { valor: "mensualidad", texto: "Mensualidad", ayuda: "Foto oscura, mensualidad grande y tres recuadros" },
  { valor: "centrado", texto: "Centrado", ayuda: "Fondo azul, nombre grande y foto al centro" },
];
const ENGANCHES = [0.1, 0.2, 0.25, 0.3, 0.4, 0.5];

export function Generador({ modelos, inicial, hoy, asesor, agencia }: {
  modelos: ModeloGenerador[]; inicial: string; hoy: string;
  asesor: { nombre: string; telefono: string }; agencia: { nombre: string; ciudad: string };
}) {
  const avisar = useAviso();
  const mes = MESES[Number(hoy.slice(5, 7)) - 1].toUpperCase();
  const disponibles = (m: ModeloGenerador) => POSICIONES.filter((p) => fuenteFoto(m, p.n)).map((p) => p.n);

  const [clave, setClave] = useState(inicial);
  const m = modelos.find((x) => x.clave === clave) ?? modelos[0];
  const [posFoto, setPosFoto] = useState(() => disponibles(m)[0] ?? 1);
  const [estilo, setEstilo] = useState<Estilo>("campana");
  const tieneCampana = (x: ModeloGenerador) => !!(x.campana?.mensualidad || x.campana?.tasa || x.campana?.enganche);
  const [fuente, setFuente] = useState<"campana" | "banorte">(tieneCampana(m) ? "campana" : "banorte");
  const [formato, setFormato] = useState<Formato>("cuadrado");
  const [conBono, setConBono] = useState(m.bono > 0);
  const [conMensualidad, setConMensualidad] = useState(true);
  const [enganche, setEnganche] = useState(0.5);
  const [plazo, setPlazo] = useState<number>(72);
  const [subtitulo, setSubtitulo] = useState(autonomiaDe(m));
  const [kicker, setKicker] = useState(`OFERTA ${mes}`);
  const [extra, setExtra] = useState("");
  const [conContacto, setConContacto] = useState(true);
  const [nombre, setNombre] = useState(asesor.nombre);
  const [telefono, setTelefono] = useState(asesor.telefono);
  const [legalExtra, setLegalExtra] = useState("");
  const [vista, setVista] = useState<{ url: string; blob: Blob } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recursos = useRef<Promise<Recursos> | null>(null);

  function cambiarModelo(c: string) {
    const n = modelos.find((x) => x.clave === c);
    if (!n) return;
    setClave(c);
    setPosFoto(disponibles(n)[0] ?? 1);
    setConBono(n.bono > 0);
    setSubtitulo(autonomiaDe(n));
    setFuente(tieneCampana(n) ? "campana" : "banorte");
  }

  const esc = useMemo(() => escenario(m, enganche, plazo), [m, enganche, plazo]);
  // Cifras: las oficiales de la campaña del mes (Catálogo) o calculadas con el cotizador Banorte.
  const oficial = fuente === "campana" && tieneCampana(m);
  const fin = useMemo(() => oficial
    ? { mensualidad: m.campana?.mensualidad ?? null, tasa: m.campana?.tasa ?? null, enganche: m.campana?.enganche ?? null }
    : { mensualidad: esc.mensualidad, tasa: esc.tasa, enganche: esc.pctEnganche }, [oficial, m, esc]);
  const bonoVisible = conBono && m.bono > 0 && (oficial || esc.bonoAplica);
  const legal = useMemo(() => textoLegal({
    modelo: m, hoy, conBono: bonoVisible, extra: legalExtra, campana: conMensualidad && oficial,
    mensualidad: conMensualidad && !oficial ? { pctEnganche: esc.pctEnganche, plazo, tasa: esc.tasa } : null,
  }), [m, hoy, bonoVisible, legalExtra, conMensualidad, oficial, esc, plazo]);
  const textos = useMemo(() => textosAnuncio({
    modelo: m, conBono: bonoVisible, mensualidad: conMensualidad && fin.mensualidad != null ? { valor: fin.mensualidad, tasa: fin.tasa ?? esc.tasa } : null,
    asesor: conContacto ? nombre : "", telefono: conContacto ? telefono : "", agencia: agencia.nombre, ciudad: agencia.ciudad,
  }), [m, bonoVisible, conMensualidad, fin, esc, conContacto, nombre, telefono, agencia]);
  const fotoUrl = fuenteFoto(m, posFoto)?.grande ?? null;
  const archivo = `anuncio-${m.clave}-${estilo}-${formato}.jpg`;

  // Redibuja el anuncio cuando cambia cualquier opción (con una pequeña pausa al escribir).
  useEffect(() => {
    if (!fotoUrl) return;
    let vigente = true;
    const t = setTimeout(async () => {
      try {
        recursos.current ??= cargarRecursosAnuncio();
        const [r, img] = await Promise.all([recursos.current, cargarImagen(fotoUrl)]);
        if (!vigente) return;
        const lienzo = dibujarAnuncio({
          modelo: m.nombre, anio: m.anio, subtitulo, kicker, precio: m.precio,
          bono: bonoVisible ? m.bono : null,
          mensualidad: conMensualidad ? fin.mensualidad : null,
          tasa: conMensualidad ? fin.tasa : null,
          enganche: conMensualidad ? fin.enganche : null,
          extra, legal,
          contacto: conContacto && (nombre.trim() || telefono.trim()) ? { nombre: nombre.trim(), telefono: telefonoBonito(telefono) } : null,
        }, img, r, estilo, formato);
        const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/jpeg", 0.92));
        if (!vigente || !blob) return;
        setError(null);
        setVista((anterior) => { if (anterior) URL.revokeObjectURL(anterior.url); return { url: URL.createObjectURL(blob), blob }; });
      } catch {
        if (vigente) setError("No se pudo dibujar el anuncio. Intenta con otra foto.");
      }
    }, 180);
    return () => { vigente = false; clearTimeout(t); };
  }, [fotoUrl, m, subtitulo, kicker, bonoVisible, conMensualidad, fin, extra, legal, conContacto, nombre, telefono, estilo, formato]);

  async function compartir() {
    if (!vista) return;
    const file = new File([vista.blob], archivo, { type: "image/jpeg" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: textos.whatsapp }).catch((e) => { if (e?.name !== "AbortError") avisar("No se pudo compartir.", "error"); });
    } else {
      descargarArchivo(archivo, vista.blob);
      avisar("Este navegador no comparte imágenes: se descargó para que la subas.");
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
      {/* Vista previa */}
      <div className="grid gap-3 lg:sticky lg:top-6">
        <div className="mx-auto w-full overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-card"
          style={{ maxWidth: formato === "historia" ? 420 : formato === "vertical" ? 560 : 620, aspectRatio: `1080 / ${FORMATOS[formato].alto}` }}>
          {vista ? (
            // eslint-disable-next-line @next/next/no-img-element -- imagen generada en el navegador (blob)
            <img src={vista.url} alt={`Anuncio de ${m.nombre}`} className="size-full object-contain" />
          ) : <div className="brillo size-full" aria-label="Generando anuncio" />}
        </div>
        {error ? <p className="text-center text-sm text-bad">{error}</p> : null}
        <div className="mx-auto flex w-full max-w-[620px] flex-wrap justify-center gap-2">
          <Boton icono={Download} disabled={!vista} onClick={() => vista && descargarArchivo(archivo, vista.blob)} className="max-sm:flex-1">Descargar</Boton>
          <Boton variante="whatsapp" icono={Share2} disabled={!vista} onClick={compartir} className="max-sm:flex-1">Compartir</Boton>
        </div>
      </div>

      {/* Opciones */}
      <div className="grid gap-5">
        <Tarjeta>
          <TituloTarjeta titulo="Auto y foto" nota={`${dinero(m.precio)}${m.bono ? ` · bono ${dinero(m.bono)}` : ""}`} />
          <div className="grid gap-4">
            <Campo etiqueta="Modelo" htmlFor="a-modelo">
              <select id="a-modelo" className="campo" value={clave} onChange={(e) => cambiarModelo(e.target.value)}>
                {modelos.map((x) => <option key={x.clave} value={x.clave}>{x.nombre} {x.anio}</option>)}
              </select>
            </Campo>
            <div className="grid grid-cols-4 gap-2">
              {POSICIONES.map((p) => {
                const f = fuenteFoto(m, p.n);
                return (
                  <button key={p.n} type="button" disabled={!f} onClick={() => setPosFoto(p.n)} title={p.etiqueta}
                    className={cx("relative aspect-[4/3] overflow-hidden rounded-lg border-2 bg-surface-2 transition", posFoto === p.n ? "border-accent shadow-md" : "border-transparent opacity-80 hover:opacity-100", !f && "cursor-not-allowed opacity-30")}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de la galería */}
                    {f ? <img src={f.mini} alt={p.etiqueta} className="size-full object-cover" /> : <span className="text-[0.7rem] text-muted">Sin foto</span>}
                  </button>
                );
              })}
            </div>
            <p className="text-[0.78rem] text-muted">¿Faltan fotos? Súbelas en <Link href="/fotos" className="inline-block py-1.5 font-semibold text-accent hover:underline">Fotos de modelos</Link>.</p>
          </div>
        </Tarjeta>

        <Tarjeta>
          <TituloTarjeta titulo="Diseño" />
          <div className="grid gap-4">
            <Opciones etiqueta="Estilo" valor={estilo} alCambiar={setEstilo} opciones={ESTILOS.map((e) => ({ valor: e.valor, texto: e.texto }))} />
            <p className="-mt-2 text-[0.78rem] text-muted">{ESTILOS.find((e) => e.valor === estilo)?.ayuda}</p>
            <Opciones etiqueta="Formato" valor={formato} alCambiar={setFormato} opciones={(Object.keys(FORMATOS) as Formato[]).map((f) => ({ valor: f, texto: FORMATOS[f].etiqueta }))} />
            <p className="-mt-2 text-[0.78rem] text-muted">{FORMATOS[formato].uso}</p>
          </div>
        </Tarjeta>

        <Tarjeta>
          <TituloTarjeta titulo="Oferta" />
          <div className="grid gap-4">
            <Casilla marcada={bonoVisible} deshabilitada={!m.bono || !esc.bonoAplica} alCambiar={setConBono}
              texto={m.bono ? `Bono flexible de ${dinero(m.bono)}` : "Este modelo no tiene bono este mes"} />
            <Casilla marcada={conMensualidad} alCambiar={setConMensualidad} texto="Mensualidad, tasa y enganche" />
            {conMensualidad && tieneCampana(m) ? (
              <Opciones etiqueta="Cifras" valor={fuente} alCambiar={setFuente} opciones={[{ valor: "campana", texto: "Campaña oficial" }, { valor: "banorte", texto: "Calcular (Banorte)" }]} />
            ) : null}
            {conMensualidad && oficial ? (
              <p className="rounded-xl bg-accent-soft px-3 py-2 text-[0.84rem]">
                {[m.campana?.mensualidad ? <>Mensualidad desde <strong>{dinero(m.campana.mensualidad)}</strong></> : null,
                  m.campana?.tasa ? <>tasa desde <strong>{(m.campana.tasa * 100).toFixed(2)}%</strong></> : null,
                  m.campana?.enganche ? <>enganche desde <strong>{Math.round(m.campana.enganche * 100)}%</strong></> : null]
                  .filter(Boolean).map((x, i) => <span key={i}>{i ? " · " : ""}{x}</span>)}
                <span className="block text-[0.76rem] text-muted">Las cifras de la campaña del mes. Se cambian en Catálogo y precios.</span>
              </p>
            ) : null}
            {conMensualidad && !oficial ? (
              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta="Enganche (con bono)" htmlFor="a-eng">
                  <select id="a-eng" className="campo" value={enganche} onChange={(e) => setEnganche(Number(e.target.value))}>
                    {ENGANCHES.map((v) => <option key={v} value={v}>{Math.round(v * 100)}%</option>)}
                  </select>
                </Campo>
                <Campo etiqueta="Plazo" htmlFor="a-plazo">
                  <select id="a-plazo" className="campo" value={plazo} onChange={(e) => setPlazo(Number(e.target.value))}>
                    {PLAZOS.map((p) => <option key={p} value={p}>{p} meses</option>)}
                  </select>
                </Campo>
                <p className="col-span-2 rounded-xl bg-accent-soft px-3 py-2 text-[0.84rem]">
                  Mensualidad <strong>{dinero(esc.mensualidad)}</strong> · tasa {(esc.tasa * 100).toFixed(2)}% · enganche {dinero(esc.enganche)}
                </p>
              </div>
            ) : null}
            <Campo etiqueta="Autonomía o detalle del modelo" htmlFor="a-sub" ayuda="Sale debajo del nombre (ej. COMB. 1,680 KM*).">
              <input id="a-sub" className="campo" value={subtitulo} onChange={(e) => setSubtitulo(e.target.value)} maxLength={28} />
            </Campo>
            {estilo === "mensualidad" ? (
              <Campo etiqueta="Frase de arriba" htmlFor="a-kick"><input id="a-kick" className="campo" value={kicker} onChange={(e) => setKicker(e.target.value)} maxLength={30} placeholder="TOTALMENTE NUEVO" /></Campo>
            ) : null}
            {estilo === "bono" ? (
              <Campo etiqueta="Línea extra (opcional)" htmlFor="a-extra" ayuda="Solo si la promoción existe, ej. O HASTA 36 MSI*.">
                <input id="a-extra" className="campo" value={extra} onChange={(e) => setExtra(e.target.value)} maxLength={34} />
              </Campo>
            ) : null}
          </div>
        </Tarjeta>

        <Tarjeta>
          <TituloTarjeta titulo="Tus datos" />
          <div className="grid gap-4">
            <Casilla marcada={conContacto} alCambiar={setConContacto} texto="Poner mi nombre y WhatsApp en el anuncio" />
            {conContacto ? (
              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta="Nombre" htmlFor="a-nom"><input id="a-nom" className="campo" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={30} /></Campo>
                <Campo etiqueta="WhatsApp" htmlFor="a-tel"><input id="a-tel" type="tel" className="campo" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="10 dígitos" /></Campo>
                {!asesor.telefono ? <p className="col-span-2 text-[0.78rem] text-muted">Guarda tu WhatsApp en <Link href="/perfil" className="inline-block py-1.5 font-semibold text-accent hover:underline">Mi perfil</Link> para que salga siempre.</p> : null}
              </div>
            ) : null}
            <Campo etiqueta="Letra chica adicional (opcional)" htmlFor="a-legal" ayuda="Se agrega a la letra chica automática (precio con IVA, bono, mensualidad y vigencia).">
              <textarea id="a-legal" className="campo min-h-[64px]" value={legalExtra} onChange={(e) => setLegalExtra(e.target.value)} maxLength={300} />
            </Campo>
          </div>
        </Tarjeta>

        <Tarjeta>
          <TituloTarjeta titulo="Texto para publicar" />
          <div className="grid gap-3">
            <Copiable etiqueta="Texto principal (Facebook, Instagram, Meta Ads)" texto={`${textos.principal}\n\n${textos.hashtags}`} />
            <Copiable etiqueta="Título del anuncio" texto={textos.titulo} />
            <Copiable etiqueta="Estado de WhatsApp" texto={textos.whatsapp} />
            <details className="rounded-xl border border-line px-3 py-2 text-[0.8rem] text-muted">
              <summary className="font-semibold text-fg">Letra chica del anuncio</summary>
              <p className="mt-2">{legal}</p>
            </details>
          </div>
        </Tarjeta>
      </div>
    </div>
  );
}

function Opciones<T extends string>({ etiqueta, valor, opciones, alCambiar }: { etiqueta: string; valor: T; opciones: { valor: T; texto: string }[]; alCambiar: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="grid gap-1.5">
      <span className="text-[0.8rem] font-semibold text-muted">{etiqueta}</span>
      <div className="grid grid-flow-col gap-1 rounded-xl bg-surface-2 p-1">
        {opciones.map((o) => (
          <button key={o.valor} type="button" role="radio" aria-checked={valor === o.valor} onClick={() => alCambiar(o.valor)}
            className={cx("rounded-lg px-2 py-2 text-[0.84rem] font-semibold transition", valor === o.valor ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg")}>
            {o.texto}
          </button>
        ))}
      </div>
    </div>
  );
}

function Casilla({ marcada, alCambiar, texto, deshabilitada }: { marcada: boolean; alCambiar: (v: boolean) => void; texto: string; deshabilitada?: boolean }) {
  return (
    <label className={cx("flex items-center gap-2.5 text-[0.9rem]", deshabilitada && "opacity-50")}>
      <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={marcada} disabled={deshabilitada} onChange={(e) => alCambiar(e.target.checked)} />
      {texto}
    </label>
  );
}

function Copiable({ etiqueta, texto }: { etiqueta: string; texto: string }) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2"><span className="text-[0.8rem] font-semibold text-muted">{etiqueta}</span><BotonCopiar texto={texto} /></div>
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-surface-2 p-3 font-sans text-[0.84rem]">{texto}</pre>
    </div>
  );
}
