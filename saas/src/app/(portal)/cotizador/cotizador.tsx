"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, Copy, Download, ExternalLink, FileText, Link2, LoaderCircle, MessageCircle, Save, ShieldCheck } from "lucide-react";
import { Boton, BotonEnlace, Campo, Pastilla, cx } from "@/components/ui";
import { copiarTexto, useAviso } from "@/components/cliente";
import { cotizacionInterna, engancheParaPresupuesto, PLAZOS, type Convenio } from "@/lib/dominio/banorte";
import { faltantesBanorte, leerRespuestaBanorte, urlBanorte, VERSION_CONECTOR, type RespuestaBanorte } from "@/lib/dominio/conector-banorte";
import { dinero, dinero2, enlaceWhatsApp } from "@/lib/dominio/formato";
import { guardarCotizacion } from "./acciones";

export type ModeloC = {
  id: string; clave: string; nombre: string; anio: number; motor: "electrico" | "hibrido"; precio: number; bono: number;
  descripcion: string | null; mini: string | null; mensualidadDesde: number | null;
  banorte: { submarca: string | null; anio: string | null; modelo: string | null };
};
export type ExtraC = { clave: string; nombre: string; precio: number };
type Parametros = { placasElectrico: number; placasHibrido: number; gestoria: number };

const PASOS = ["Vehículo y cliente", "Enganche y extras", "Resumen y Banorte"] as const;
const num = (v: string) => { const n = Number(String(v).replace(/[^\d.]/g, "")); return Number.isFinite(n) ? n : 0; };
const pct = (t: number) => `${(t * 100).toFixed(2)} %`;
const claveConvenio = (c: Convenio) => `${c.nombre}|${c.tasa}`;

type EstadoBanco = { estado: "listo" | "abriendo" | RespuestaBanorte["estado"] | "sin-respuesta"; mensaje: string };

export function Cotizador({ modelos, extras, parametros, vendedores, yo, direccion, usuario, vigencia }: {
  modelos: ModeloC[]; extras: ExtraC[]; parametros: Parametros; vendedores: { id: string; nombre: string; titulo: string }[];
  yo: string; direccion: boolean; usuario: string; vigencia: string;
}) {
  const router = useRouter();
  const avisar = useAviso();
  const [paso, setPaso] = useState(0);
  const [responsable, setResponsable] = useState(vendedores.some((v) => v.id === yo) ? yo : vendedores[0]?.id ?? yo);
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [modeloId, setModeloId] = useState(modelos.find((m) => m.clave.startsWith("king-gl"))?.id ?? modelos[0]?.id ?? "");
  const [cp, setCp] = useState("");
  const [edad, setEdad] = useState("");
  const [genero, setGenero] = useState("");
  const m = modelos.find((x) => x.id === modeloId) ?? modelos[0];
  const sugerido = (x: ModeloC) => Math.round((x.precio * 0.2) / 1000) * 1000;
  const [modo, setModo] = useState<"enganche" | "presupuesto">("enganche");
  const [enganche, setEnganche] = useState(() => String(sugerido(m)));
  const [presupuesto, setPresupuesto] = useState("100000");
  const [convenioSel, setConvenioSel] = useState("auto");
  const [plazo, setPlazo] = useState(72);
  const [marcados, setMarcados] = useState<Set<string>>(() => new Set(extras.filter((x) => x.clave === "garantia").map((x) => x.clave)));
  const [otros, setOtros] = useState("");
  const [seguroAuto, setSeguroAuto] = useState("");
  const [seguroVida, setSeguroVida] = useState("");
  const [oficial, setOficial] = useState({ mensualidad: "", comision: "" });
  const [ocupado, iniciar] = useTransition();
  // Conector Banorte: pestaña abierta, cotización enviada y lo que regresó la extensión.
  const ventana = useRef<Window | null>(null);
  const solicitud = useRef({ id: "", firma: "", respondio: false });
  const [banco, setBanco] = useState<EstadoBanco>({ estado: "listo", mensaje: "" });
  const [resultado, setResultado] = useState<{ firma: string; r: RespuestaBanorte } | null>(null);

  useEffect(() => {
    function recibir(e: MessageEvent) {
      const r = leerRespuestaBanorte(e, { ventana: ventana.current, requestId: solicitud.current.id });
      if (!r) return;
      solicitud.current.respondio = true;
      if (r.estado === "working") { setBanco({ estado: "working", mensaje: r.mensaje || "Banorte está calculando…" }); return; }
      setBanco({ estado: r.estado, mensaje: r.mensaje });
      if (r.estado === "error") return;
      // Los seguros que cotizó Banorte se capturan solos (se pagan a la firma).
      if (r.seguroAuto && r.seguroAuto > 0) setSeguroAuto(String(r.seguroAuto));
      if (r.seguroVida && r.seguroVida > 0) setSeguroVida(String(r.seguroVida));
      setResultado({ firma: solicitud.current.firma, r });
    }
    window.addEventListener("message", recibir);
    return () => window.removeEventListener("message", recibir);
  }, []);

  function cambiarModelo(id: string) {
    const n = modelos.find((x) => x.id === id);
    setModeloId(id);
    if (n) setEnganche(String(sugerido(n)));
    setConvenioSel("auto");
    setOficial({ mensualidad: "", comision: "" });
  }

  const garantia = extras.filter((x) => x.clave === "garantia" && marcados.has(x.clave)).reduce((t, x) => t + x.precio, 0);
  const accesorios = extras.filter((x) => x.clave !== "garantia" && marcados.has(x.clave)).reduce((t, x) => t + x.precio, 0) + num(otros);
  const seguros = num(seguroAuto) + num(seguroVida);
  const placas = m.motor === "electrico" ? parametros.placasElectrico : parametros.placasHibrido;

  const c = useMemo(() => {
    const base = { modelo: m, accesorios, garantia, plazo, seguros };
    const et = modo === "presupuesto" ? engancheParaPresupuesto(base, num(presupuesto)) : num(enganche);
    const auto = cotizacionInterna({ ...base, engancheTotal: et });
    const elegido = auto.disponibles.find((x) => claveConvenio(x) === convenioSel) ?? null;
    const q = elegido ? cotizacionInterna({ ...base, engancheTotal: et, convenio: elegido }) : auto;
    return { ...q, engancheTotal: et, disponibles: auto.disponibles, manual: !!elegido };
  }, [m, accesorios, garantia, plazo, seguros, modo, presupuesto, enganche, convenioSel]);

  // Lo que se mandó a Banorte: si cambia algo de esto, la verificación ya no aplica.
  const firma = [m.id, c.engancheTotal, accesorios, garantia, c.convenio.nombre, c.convenio.tasa].join("|");
  const deBanorte = resultado && resultado.firma === firma && !resultado.r.ajusteMinimo ? resultado.r : null;
  const filaBanorte = deBanorte?.filas.find((f) => f.plazo === plazo) ?? null;
  const autoVerificado = deBanorte?.estado === "verified" && !!filaBanorte;
  const desactualizado = !!resultado && resultado.firma !== firma;
  const mensualidadOficial = autoVerificado && filaBanorte ? filaBanorte.monthly : num(oficial.mensualidad);
  const comisionOficial = autoVerificado && deBanorte?.comision ? deBanorte.comision : num(oficial.comision);
  const verificado = mensualidadOficial > 0;
  const faltan = faltantesBanorte({ codigo: m.banorte.modelo, cp, edad, genero });

  function abrirBanorte() {
    if (faltan.length) { setBanco({ estado: "error", mensaje: `Para cotizar en Banorte falta: ${faltan.join(", ")}.` }); return; }
    if (c.monto <= 0) { setBanco({ estado: "error", mensaje: "Con este enganche no hay monto a financiar. Revisa el enganche o el presupuesto." }); return; }
    const id = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : String(Date.now());
    const url = urlBanorte({
      requestId: id, origen: location.origin,
      modelo: { nombre: m.nombre, anio: m.anio, precio: m.precio, submarca: m.banorte.submarca, anioBanorte: m.banorte.anio, codigo: m.banorte.modelo },
      accesorios, garantia, enganche: c.engancheTotal, plazo, cp, edad: Number(edad), genero: genero as "Masculino" | "Femenino",
      descripcionAccesorios: extras.filter((x) => x.clave !== "garantia" && marcados.has(x.clave)).map((x) => x.nombre).concat(num(otros) ? ["Otros accesorios"] : []).join(", "),
      convenio: c.convenio.nombre,
      esperado: { monto: c.monto, comision: c.comision, mensualidad: c.mensualidad, tasa: c.convenio.tasa },
    });
    // Pestaña nueva cada vez: la extensión solo lee la cotización al cargar la página.
    try { if (ventana.current && !ventana.current.closed) ventana.current.close(); } catch {}
    let w: Window | null = null;
    try { w = window.open(url, "_blank"); } catch { w = null; }
    if (!w) { setBanco({ estado: "error", mensaje: "Chrome bloqueó la pestaña de Banorte. Permite ventanas emergentes para este sitio y vuelve a intentar." }); return; }
    ventana.current = w;
    solicitud.current = { id, firma, respondio: false };
    setResultado(null);
    setBanco({ estado: "abriendo", mensaje: "Banorte abierto. La extensión está llenando el simulador; no toques esa pestaña." });
    setTimeout(() => {
      if (solicitud.current.id === id && !solicitud.current.respondio)
        setBanco({ estado: "sin-respuesta", mensaje: `Banorte no ha respondido. Revisa que la extensión Conector Banorte v${VERSION_CONECTOR} esté instalada y mira la pestaña de Banorte.` });
    }, 90000);
  }

  function usarImportesBanorte() {
    if (!resultado) return;
    const f = resultado.r.filas.find((x) => x.plazo === plazo);
    setOficial({ mensualidad: f ? String(f.monthly) : resultado.r.mensualidad ? String(resultado.r.mensualidad) : "", comision: resultado.r.comision ? String(resultado.r.comision) : "" });
  }
  const mensualidad = verificado ? mensualidadOficial : c.mensualidad;
  const comision = comisionOficial > 0 ? comisionOficial : c.comision;
  const bolsa = c.aportacion + comision + seguros;
  const nombreModelo = `${m.nombre} ${m.anio}`;
  const extrasTxt = extras.filter((x) => marcados.has(x.clave)).map((x) => x.nombre);
  const primer = cliente.trim().split(/\s+/)[0];
  const responsableNombre = vendedores.find((v) => v.id === responsable)?.nombre ?? "";

  const mensaje = [
    primer ? `Hola ${primer}, te comparto tu cotización:` : "Te comparto tu cotización:",
    `🚗 BYD ${nombreModelo}`,
    `Precio: ${dinero(m.precio)}`,
    `Enganche total: ${dinero(c.engancheTotal)}${c.bonoAplica ? ` (incluye bono de ${dinero(c.bono)})` : ""}`,
    extrasTxt.length ? `Incluye: ${extrasTxt.join(", ")}` : null,
    `Mensualidad${verificado ? "" : " estimada"}: ${dinero2(mensualidad)} a ${plazo} meses`,
    `Tasa fija anual: ${(c.convenio.tasa * 100).toFixed(2)}% · Banorte`,
    `Pago a la firma: ${dinero2(bolsa)}${seguros ? " (con seguros del primer año)" : ""}`,
    `Placas y gestoría aparte. Sujeto a aprobación de crédito.`,
    responsableNombre ? `${responsableNombre} · BYD Cumbres` : null,
  ].filter(Boolean).join("\n");

  const urlPdf = `/cotizacion?${new URLSearchParams({
    m: m.id, et: String(Math.round(c.engancheTotal)), pl: String(plazo), ext: [...marcados].join(","), acc: String(num(otros)),
    seg: String(seguros), ...(c.manual ? { conv: String(c.convenio.tasa) } : {}), ...(verificado ? { mo: String(mensualidadOficial) } : {}),
    ...(comisionOficial ? { co: String(comisionOficial) } : {}), ...(cliente.trim() ? { cli: cliente.trim() } : {}), r: responsable,
  })}`;

  const guardar = () => iniciar(async () => {
    const r = await guardarCotizacion({
      responsableId: responsable, nombre: cliente, telefono, modeloId: m.id, enganche: c.engancheTotal,
      resumen: [`BYD ${nombreModelo} · enganche total ${dinero(c.engancheTotal)} · ${plazo} meses · ${dinero2(mensualidad)}/mes (${(c.convenio.tasa * 100).toFixed(2)}%)`,
        extrasTxt.length ? `Extras: ${extrasTxt.join(", ")}` : "", `A la firma: ${dinero2(bolsa)}`, cp || edad || genero ? `CP ${cp || "—"} · edad ${edad || "—"} · ${genero || "—"}` : ""].filter(Boolean).join("\n"),
    });
    avisar(r.ok ? r.mensaje ?? "Guardado" : r.error, r.ok ? "ok" : "error");
    if (r.ok) router.refresh();
  });

  return (
    <div className="grid gap-5">
      <nav aria-label="Pasos" className="grid grid-cols-3 gap-2">
        {PASOS.map((t, i) => (
          <button key={t} type="button" onClick={() => setPaso(i)} aria-current={paso === i ? "step" : undefined}
            className={cx("rounded-xl border px-2 py-2.5 text-[0.84rem] font-semibold transition sm:text-[0.9rem]", paso === i ? "border-transparent bg-accent text-on-accent shadow-[0_8px_18px_-10px_var(--accent)]" : "border-line bg-surface text-muted hover:text-fg")}>
            <span className="max-sm:hidden">{i + 1}. </span>{t}
          </button>
        ))}
      </nav>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-start">
        <section className="aparece grid gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card" key={paso}>
          <Encabezado n={paso + 1} titulo={["Vehículo y cliente", "Enganche y protección", "Revisa y genera la propuesta"][paso]}
            sub={["Precios y bonos de la oferta del mes.", "Los accesorios y la garantía se financian.", "Un clic abre Banorte; la extensión lo llena y regresa los importes oficiales."][paso]} />

          {paso === 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Responsable" htmlFor="c-resp">
                  <select id="c-resp" className="campo" value={responsable} disabled={!direccion} onChange={(e) => setResponsable(e.target.value)}>
                    {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nombre} · {v.titulo}</option>)}
                  </select>
                </Campo>
                <Campo etiqueta={<>Nombre del cliente <span className="font-normal text-subtle">opcional</span></>} htmlFor="c-cli">
                  <input id="c-cli" className="campo" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre para el mensaje" />
                </Campo>
              </div>
              <Campo etiqueta="Modelo" htmlFor="c-modelo">
                <select id="c-modelo" className="campo" value={modeloId} onChange={(e) => cambiarModelo(e.target.value)}>
                  {modelos.map((x) => <option key={x.id} value={x.id}>{x.nombre} {x.anio} · {dinero2(x.precio)}</option>)}
                </select>
              </Campo>
              <div className="grid gap-4 sm:grid-cols-3">
                <Campo etiqueta="Código postal" htmlFor="c-cp"><input id="c-cp" className="campo" inputMode="numeric" maxLength={5} value={cp} onChange={(e) => setCp(e.target.value.replace(/\D/g, ""))} placeholder="66400" /></Campo>
                <Campo etiqueta="Edad" htmlFor="c-edad"><input id="c-edad" className="campo" inputMode="numeric" maxLength={2} value={edad} onChange={(e) => setEdad(e.target.value.replace(/\D/g, ""))} placeholder="40" /></Campo>
                <Campo etiqueta="Género (Banorte)" htmlFor="c-gen"><select id="c-gen" className="campo" value={genero} onChange={(e) => setGenero(e.target.value)}><option value="">—</option><option>Masculino</option><option>Femenino</option></select></Campo>
              </div>
              <Campo etiqueta={<>WhatsApp del cliente <span className="font-normal text-subtle">opcional</span></>} htmlFor="c-tel">
                <input id="c-tel" type="tel" className="campo" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="10 dígitos" />
              </Campo>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Tile k="Precio de lista" v={dinero2(m.precio)} />
                <Tile k="Bono al enganche" v={m.bono ? dinero2(m.bono) : "Sin bono"} acento={!!m.bono} />
                {m.mensualidadDesde ? <Tile k="Campaña: desde" v={`${dinero(m.mensualidadDesde)}/mes`} /> : null}
              </div>
              {m.descripcion ? <p className="text-[0.82rem] text-muted">{m.descripcion} · <a href={`/fotos#${m.clave}`} className="font-semibold text-accent hover:underline">Fotos para el cliente</a></p> : null}
              <Boton icono={ArrowRight} onClick={() => setPaso(1)} className="w-full">Continuar</Boton>
            </>
          ) : null}

          {paso === 1 ? (
            <>
              <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-line px-4 py-3" role="radiogroup" aria-label="Cómo calcular">
                {([["enganche", "Capturar enganche"], ["presupuesto", "Presupuesto a la firma"]] as const).map(([v, t]) => (
                  <label key={v} className="inline-flex items-center gap-2 text-[0.9rem] font-semibold"><input type="radio" name="modo" className="size-4 accent-[var(--accent)]" checked={modo === v} onChange={() => setModo(v)} />{t}</label>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {modo === "enganche" ? (
                  <Campo etiqueta="Enganche total, incluido el bono" htmlFor="c-eng" ayuda={c.bonoAplica ? `El cliente pone ${dinero(c.aportacion)} + bono ${dinero(c.bono)}` : "Menos de 5%: no aplica el bono"}>
                    <input id="c-eng" className="campo" inputMode="decimal" value={enganche} onChange={(e) => setEnganche(e.target.value)} />
                  </Campo>
                ) : (
                  <Campo etiqueta="De la bolsa del cliente a la firma" htmlFor="c-pres" ayuda={`Enganche total resultante: ${dinero(c.engancheTotal)}`}>
                    <input id="c-pres" className="campo" inputMode="decimal" value={presupuesto} onChange={(e) => setPresupuesto(e.target.value)} />
                  </Campo>
                )}
                <Campo etiqueta="Convenio de Banorte" htmlFor="c-conv" ayuda={`${Math.round(c.pctEnganche * 100)}% de enganche · ${c.convenio.nombre}`}>
                  <select id="c-conv" className="campo" value={c.manual ? convenioSel : "auto"} onChange={(e) => setConvenioSel(e.target.value)}>
                    <option value="auto">Automático · mejor tasa disponible</option>
                    {c.disponibles.map((x) => <option key={claveConvenio(x)} value={claveConvenio(x)}>{x.nombre} · {pct(x.tasa)}</option>)}
                  </select>
                </Campo>
                <Campo etiqueta="Plazo" htmlFor="c-plazo">
                  <select id="c-plazo" className="campo" value={plazo} onChange={(e) => setPlazo(Number(e.target.value))}>{PLAZOS.map((n) => <option key={n} value={n}>{n} meses</option>)}</select>
                </Campo>
                <Campo etiqueta="Otros accesorios financiados" htmlFor="c-otros"><input id="c-otros" className="campo" inputMode="decimal" value={otros} onChange={(e) => setOtros(e.target.value)} placeholder="$0" /></Campo>
              </div>
              <ul className="grid gap-1 grid-cols-[minmax(0,1fr)]">
                {extras.map((x) => (
                  <li key={x.clave}>
                    <label className="flex items-center gap-3 rounded-lg px-1 py-1.5 text-[0.92rem] hover:bg-surface-2">
                      <input type="checkbox" className="size-[18px] accent-[var(--accent)]" checked={marcados.has(x.clave)}
                        onChange={(e) => { const n = new Set(marcados); if (e.target.checked) n.add(x.clave); else n.delete(x.clave); setMarcados(n); }} />
                      <span className="flex-1">{x.nombre}</span><span className="font-semibold tabular-nums">{dinero(x.precio)}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="text-[0.78rem] text-muted">Con menos de 20% de enganche se usan condiciones generales de Banorte, sin convenio especial. Placas y gestoría van aparte.</p>
              <div className="grid grid-cols-[auto_1fr] gap-2"><Boton variante="secundario" icono={ArrowLeft} onClick={() => setPaso(0)}>Atrás</Boton><Boton icono={ArrowRight} onClick={() => setPaso(2)}>Ver resumen</Boton></div>
            </>
          ) : null}

          {paso === 2 ? (
            <>
              <p className="rounded-xl bg-accent-soft px-4 py-3 text-[0.92rem]">{nombreModelo} · {plazo} meses · Enganche {dinero2(c.engancheTotal)}</p>
              <div className="grid gap-3 rounded-xl border border-line p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Campo etiqueta="Código postal" htmlFor="b-cp"><input id="b-cp" className="campo" inputMode="numeric" maxLength={5} value={cp} onChange={(e) => setCp(e.target.value.replace(/\D/g, ""))} placeholder="66400" /></Campo>
                  <Campo etiqueta="Edad" htmlFor="b-edad"><input id="b-edad" className="campo" inputMode="numeric" maxLength={2} value={edad} onChange={(e) => setEdad(e.target.value.replace(/\D/g, ""))} placeholder="40" /></Campo>
                  <Campo etiqueta="Género" htmlFor="b-gen"><select id="b-gen" className="campo" value={genero} onChange={(e) => setGenero(e.target.value)}><option value="">—</option><option>Masculino</option><option>Femenino</option></select></Campo>
                </div>
                <Boton icono={ExternalLink} onClick={abrirBanorte} className="w-full">
                  {banco.estado === "listo" ? "Cotizar y verificar en Banorte" : "Volver a cotizar en Banorte"}
                </Boton>
                {banco.estado !== "listo" && !(desactualizado && banco.estado === "verified") ? (
                  <p role="status" className={cx("flex items-start gap-2 whitespace-pre-line rounded-lg border px-3 py-2 text-[0.84rem]",
                    banco.estado === "verified" ? "border-ok/30 bg-ok-soft" : banco.estado === "review" ? "border-warn/30 bg-warn-soft" : banco.estado === "error" || banco.estado === "sin-respuesta" ? "border-bad/30 bg-bad-soft" : "border-accent/30 bg-accent-soft")}>
                    {banco.estado === "abriendo" || banco.estado === "working" ? <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin" /> : null}
                    <span>{banco.estado === "verified" ? "Banorte coincide con el cotizador. Mensualidad, comisión y seguros oficiales capturados." : banco.mensaje}</span>
                  </p>
                ) : <p className="text-[0.8rem] text-muted">Abre el simulador oficial; la extensión llena todo, calcula y regresa aquí la mensualidad, la comisión y los seguros.</p>}
                {desactualizado ? <p className="text-[0.8rem] text-warn">Cambiaste datos después de cotizar en Banorte{modo === "presupuesto" ? " (o los seguros oficiales movieron el enganche)" : ""}: vuelve a cotizar para verificarla.</p> : null}
                {resultado && !desactualizado && resultado.r.estado === "review" && resultado.r.filas.length ? (
                  <Boton variante="secundario" icono={BadgeCheck} onClick={usarImportesBanorte}>Usar los importes de Banorte</Boton>
                ) : null}
                <details className="text-[0.82rem]">
                  <summary className="cursor-pointer font-semibold text-muted">Instalar la extensión de Chrome (una vez por computadora)</summary>
                  <ol className="mt-2 grid list-decimal gap-1 pl-5 text-muted">
                    <li>Descarga y descomprime el <a href="/conector-banorte.zip" download className="font-semibold text-accent hover:underline">Conector Banorte v{VERSION_CONECTOR}</a> en una carpeta que no vayas a borrar.</li>
                    <li>Abre <b>chrome://extensions</b> y activa <b>Modo de desarrollador</b>.</li>
                    <li>Pulsa <b>Cargar extensión sin empaquetar</b> y elige la carpeta. Si tenías la versión del cotizador anterior, quítala.</li>
                    <li>Regresa aquí y presiona <b>Cotizar y verificar en Banorte</b>. Si Chrome bloquea la ventana, permite ventanas emergentes para este sitio.</li>
                  </ol>
                  <a href="/conector-banorte.zip" download className={cx("mt-2 inline-flex items-center gap-1.5 font-semibold text-accent hover:underline")}><Download className="size-3.5" />Descargar conector-banorte.zip</a>
                </details>
              </div>
              <details className="rounded-xl border border-line px-4 py-3" open={!!seguros}>
                <summary className="cursor-pointer text-[0.9rem] font-semibold">Seguros del primer año · captura del cotizador Banorte</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Campo etiqueta="Seguro de auto (anual)" htmlFor="c-sa"><input id="c-sa" className="campo" inputMode="decimal" value={seguroAuto} onChange={(e) => setSeguroAuto(e.target.value)} placeholder="$0" /></Campo>
                  <Campo etiqueta="Seguro de vida / desempleo" htmlFor="c-sv"><input id="c-sv" className="campo" inputMode="decimal" value={seguroVida} onChange={(e) => setSeguroVida(e.target.value)} placeholder="$0" /></Campo>
                </div>
                <p className="mt-2 text-[0.76rem] text-muted">Banorte los calcula con código postal {cp || "—"}, edad {edad || "—"} y género {genero || "—"}. Se suman a lo que paga el cliente a la firma.</p>
              </details>
              <details className="rounded-xl border border-line px-4 py-3" open={verificado && !autoVerificado}>
                <summary className="cursor-pointer text-[0.9rem] font-semibold">Captura manual de Banorte (si la extensión no regresa los importes)</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Campo etiqueta="Mensualidad oficial" htmlFor="c-mo"><input id="c-mo" className="campo" inputMode="decimal" value={oficial.mensualidad} onChange={(e) => setOficial({ ...oficial, mensualidad: e.target.value })} placeholder={dinero2(c.mensualidad)} /></Campo>
                  <Campo etiqueta="Comisión por apertura oficial" htmlFor="c-co"><input id="c-co" className="campo" inputMode="decimal" value={oficial.comision} onChange={(e) => setOficial({ ...oficial, comision: e.target.value })} placeholder={dinero2(c.comision)} /></Campo>
                </div>
                {verificado && Math.abs(mensualidadOficial - c.mensualidad) >= 1 ? <p className="mt-2 text-[0.78rem] text-warn">Diferencia contra el estimado: {dinero2(mensualidadOficial - c.mensualidad)}. Revisa seguros financiados o el convenio.</p> : null}
              </details>
              <div className="grid gap-2 sm:grid-cols-2">
                <Boton icono={MessageCircle} variante="whatsapp" onClick={() => window.open(enlaceWhatsApp(telefono, mensaje), "_blank", "noopener")}>Enviar por WhatsApp</Boton>
                <Boton icono={Copy} variante="secundario" onClick={async () => avisar(await copiarTexto(mensaje) ? "Mensaje copiado" : "No se pudo copiar", "ok")}>Copiar mensaje</Boton>
                <BotonEnlace icono={FileText} variante="secundario" href={urlPdf} externo>Cotización en PDF</BotonEnlace>
                <Boton icono={Save} variante="secundario" disabled={ocupado || cliente.trim().length < 2} onClick={guardar} title={cliente.trim().length < 2 ? "Escribe el nombre del cliente en el paso 1" : undefined}>{ocupado ? "Guardando…" : "Guardar en el CRM"}</Boton>
              </div>
              <Boton variante="fantasma" icono={ArrowLeft} onClick={() => setPaso(1)}>Ajustar enganche y extras</Boton>
            </>
          ) : null}
        </section>

        {/* Resumen siempre a la vista */}
        <aside className="grid gap-3 rounded-2xl border border-line bg-surface p-5 shadow-card lg:sticky lg:top-6">
          <Encabezado n={3} titulo="Resumen de cotización" sub={`${nombreModelo} · ${plazo} meses`} />
          <div className="rounded-2xl bg-[#0a2c4f] px-5 py-4 text-white">
            <p className="text-[0.84rem] opacity-85">Mensualidad {verificado ? "Banorte" : "estimada"}</p>
            <p key={`${mensualidad}`} className="num aparece text-[2.6rem] leading-tight">{dinero2(mensualidad)}</p>
            <p className="text-[0.78rem] opacity-80">{autoVerificado ? "Importe oficial que regresó el simulador Banorte." : verificado ? "Importe capturado del cotizador Banorte." : "La cifra oficial se confirma en Banorte."}</p>
          </div>
          {verificado ? <Pastilla tono="ok" className="w-fit text-[0.78rem]"><BadgeCheck className="size-3.5" />Verificada con Banorte</Pastilla>
            : <p className="rounded-xl border border-warn/30 bg-warn-soft px-3 py-2 text-[0.82rem]">Banorte pendiente: en el paso 3 presiona “Cotizar y verificar en Banorte”.</p>}
          <dl className="grid text-[0.9rem] [&>div]:flex [&>div]:justify-between [&>div]:gap-3 [&>div]:border-b [&>div]:border-line [&>div]:py-2 [&_dd]:font-semibold [&_dd]:tabular-nums [&_dt]:text-muted">
            <div><dt>Precio de factura</dt><dd>{dinero2(m.precio)}</dd></div>
            {accesorios ? <div><dt>Accesorios financiados</dt><dd>{dinero2(accesorios)}</dd></div> : null}
            {garantia ? <div><dt>Garantía financiada</dt><dd>{dinero2(garantia)}</dd></div> : null}
            <div><dt>Enganche total</dt><dd>{dinero2(c.engancheTotal)}</dd></div>
            {c.bonoAplica ? <div><dt>Bono aplicado al enganche</dt><dd>−{dinero2(c.bono)}</dd></div> : null}
            <div><dt>Comisión por apertura</dt><dd>{dinero2(comision)}</dd></div>
            {seguros ? <div><dt>Seguros primer año</dt><dd>{dinero2(seguros)}</dd></div> : null}
            <div className="border-b-2!"><dt className="font-semibold text-fg!">De la bolsa del cliente a la firma</dt><dd className="text-[1.15rem] text-accent">{dinero2(bolsa)}</dd></div>
            <div><dt>Monto a financiar</dt><dd>{dinero2(c.monto)}</dd></div>
            <div><dt>Tasa</dt><dd>{pct(c.convenio.tasa)}{c.manual ? " · elegida" : ""}</dd></div>
          </dl>
          <p className="text-[0.84rem] font-semibold">Otros plazos</p>
          <div className="grid grid-cols-3 gap-2">
            {c.plazos.map((x) => ({ n: x.n, mensualidad: (autoVerificado ? deBanorte?.filas.find((f) => f.plazo === x.n)?.monthly : null) ?? x.mensualidad })).map((p) => (
              <button key={p.n} type="button" onClick={() => setPlazo(p.n)} className={cx("rounded-xl px-2 py-2 text-center transition", p.n === plazo ? "bg-accent-soft ring-1 ring-accent" : "bg-surface-2 hover:bg-accent-soft/60")}>
                <span className="block text-[0.72rem] text-muted">{p.n} meses</span><span className="block text-[0.86rem] font-semibold tabular-nums">{dinero2(p.mensualidad)}</span>
              </button>
            ))}
          </div>
          <p className="text-[0.8rem] text-muted">Trámites aparte: placas {dinero2(placas)} · gestoría {dinero2(parametros.gestoria)} si la agencia realiza el trámite.</p>
          <p className="flex items-start gap-2 text-[0.74rem] text-subtle"><ShieldCheck className="mt-0.5 size-3.5 shrink-0" />Cotización ilustrativa sujeta a disponibilidad y aprobación de crédito. Seguro anual; renovaciones fuera de estas mensualidades. La primera mensualidad puede diferir por los días del periodo. Vigencia de bonos: {vigencia}.</p>
        </aside>
      </div>

      <p className="flex flex-wrap items-center gap-2 text-[0.8rem] text-muted">
        <Link2 className="size-4" />Cotizador para que el cliente calcule solo:
        <a href={`/cotiza?a=${encodeURIComponent(usuario)}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline">abrir</a>·
        <button type="button" className="font-semibold text-accent hover:underline" onClick={async () => avisar(await copiarTexto(`${location.origin}/cotiza?a=${encodeURIComponent(usuario)}`) ? "Link copiado" : "No se pudo copiar", "ok")}>copiar mi link</button>
      </p>
    </div>
  );
}

function Encabezado({ n, titulo, sub }: { n: number; titulo: string; sub: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft font-mono text-[0.8rem] font-bold text-accent">{String(n).padStart(2, "0")}</span>
      <div><h2 className="text-[1.15rem] font-semibold leading-tight">{titulo}</h2><p className="text-[0.84rem] text-muted">{sub}</p></div>
    </div>
  );
}
function Tile({ k, v, acento }: { k: string; v: string; acento?: boolean }) {
  return <div className="rounded-xl bg-surface-2 px-4 py-3"><p className="text-[0.76rem] text-muted">{k}</p><p className={cx("text-[1.1rem] font-semibold tabular-nums", acento && "text-accent")}>{v}</p></div>;
}
