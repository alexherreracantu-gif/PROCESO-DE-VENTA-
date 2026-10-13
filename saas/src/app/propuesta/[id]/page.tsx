import Link from "next/link";
import { notFound } from "next/navigation";
import { catalogo } from "@/lib/datos";
import { requerirSesion } from "@/lib/sesion";
import { fechaLarga, hoy } from "@/lib/dominio/fechas";
import { dinero } from "@/lib/dominio/formato";
import { ahorroFlotilla, MODELOS_POR_TIPO, SUPUESTOS, TIPOS_FLOTILLA, type TipoFlotilla } from "@/lib/dominio/flotillas";
import { telefonoBonito, vigencia } from "@/lib/anuncios";
import { FOTOS_INCLUIDAS } from "@/lib/fotos-incluidas";
import { Logo } from "@/components/marca";
import { BotonImprimir } from "@/app/hoja/[id]/imprimir";

export const metadata = { title: "Propuesta de flotilla" };

const entero = (v: unknown, def: number, max: number) => {
  const n = Math.round(Number(Array.isArray(v) ? v[0] : v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : def;
};
const texto = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 120) : "");

/**
 * Propuesta preliminar de flotilla para imprimir o guardar como PDF. Toma los datos que el cliente dejó en
 * la landing (o los que el asesor ajusta arriba) y los permisos por fila: cada asesor solo abre sus prospectos.
 */
export default async function Propuesta(props: PageProps<"/propuesta/[id]">) {
  const s = await requerirSesion();
  const { id } = await props.params;
  const sp = await props.searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: p } = await s.sb.from("prospectos").select("id, nombre, asesor_id, datos").eq("id", id)
    .maybeSingle<{ id: string; nombre: string; asesor_id: string; datos: { flotilla?: Record<string, unknown> } | null }>();
  if (!p) notFound();

  const fl = p.datos?.flotilla ?? {};
  const tipoPedido = texto(sp.tipo) || texto(fl.tipo);
  const tipo: TipoFlotilla = (TIPOS_FLOTILLA as readonly string[]).includes(tipoPedido) ? (tipoPedido as TipoFlotilla) : "Empresa";
  const organizacion = texto(sp.org) || texto(fl.organizacion) || p.nombre;
  const unidades = entero(sp.u ?? fl.unidades, 5, 5000);
  const kmDia = entero(sp.km ?? fl.kmDia, 80, 2000);
  const precioFlotilla = entero(sp.pf, 0, 50_000_000);

  const { modelos } = await catalogo(s);
  const recomendados = MODELOS_POR_TIPO[tipo].flatMap((r) => {
    const m = modelos.find((x) => x.clave === r.clave && x.precio > 0);
    return m ? [{ ...r, nombre: m.nombre, precio: m.precio, motor: m.motor }] : [];
  });
  const principal = recomendados.find((r) => r.clave === texto(sp.m)) ?? recomendados[0];
  if (!principal) notFound();
  const fotos = FOTOS_INCLUIDAS[principal.clave] ?? {};
  const fotoId = principal.clave.startsWith("king") ? fotos[2] ?? fotos[1] : fotos[1];
  const a = ahorroFlotilla(unidades, kmDia);
  const ahorroPrincipal = principal.motor === "electrico" ? a.electrico : a.hibrido;
  const precioUnidad = precioFlotilla || principal.precio;

  const { data: asesor } = await s.sb.from("perfiles").select("nombre, telefono").eq("id", p.asesor_id).maybeSingle<{ nombre: string; telefono: string | null }>();
  const tel = telefonoBonito(asesor?.telefono ?? null);
  const fila = (k: string, v: string, fuerte?: boolean) => (
    <div className="flex justify-between gap-4 border-b border-[#e3e7ec] py-1.5 text-[0.86rem] last:border-0"><span className="text-[#5b6472]">{k}</span><span className={fuerte ? "text-right font-semibold tabular-nums" : "text-right tabular-nums"}>{v}</span></div>
  );

  return (
    <div className="min-h-dvh bg-[#eef1f5] px-4 py-6 print:bg-white print:p-0">
      {/* Ajustes del asesor antes de imprimir */}
      <form className="mx-auto mb-4 grid max-w-[820px] gap-3 rounded-2xl bg-white p-4 shadow print:hidden sm:grid-cols-3" method="get">
        <Link href="/crm" className="text-sm font-semibold text-muted hover:text-fg sm:col-span-3">← Volver al CRM</Link>
        <label className="grid gap-1 text-[0.78rem] font-semibold text-muted">Organización<input className="campo" name="org" defaultValue={organizacion} /></label>
        <label className="grid gap-1 text-[0.78rem] font-semibold text-muted">Tipo
          <select className="campo" name="tipo" defaultValue={tipo}>{TIPOS_FLOTILLA.map((t) => <option key={t}>{t}</option>)}</select>
        </label>
        <label className="grid gap-1 text-[0.78rem] font-semibold text-muted">Modelo principal
          <select className="campo" name="m" defaultValue={principal.clave}>{recomendados.map((r) => <option key={r.clave} value={r.clave}>{r.nombre}</option>)}</select>
        </label>
        <label className="grid gap-1 text-[0.78rem] font-semibold text-muted">Unidades<input className="campo" name="u" type="number" min={1} defaultValue={unidades} /></label>
        <label className="grid gap-1 text-[0.78rem] font-semibold text-muted">Km por unidad al día<input className="campo" name="km" type="number" min={1} defaultValue={kmDia} /></label>
        <label className="grid gap-1 text-[0.78rem] font-semibold text-muted">Precio de flotilla autorizado por unidad<input className="campo" name="pf" type="number" min={0} step={100} defaultValue={precioFlotilla || ""} placeholder="Déjalo vacío si no está autorizado" /></label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
          <button type="submit" className="rounded-xl border border-line px-4 py-2 text-sm font-semibold">Actualizar</button>
          <span className="flex-1 text-[0.78rem] text-muted">Revisa los números, luego guárdala como PDF y mándala por WhatsApp o correo.</span>
          <BotonImprimir />
        </div>
      </form>

      <article className="mx-auto max-w-[820px] overflow-hidden rounded-2xl bg-white text-[#141820] shadow-xl print:max-w-none print:rounded-none print:shadow-none">
        <header className="flex flex-wrap items-center gap-4 bg-[linear-gradient(120deg,#0a3d7a,#0a6fb8)] px-8 py-5 text-white print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
          <Logo tono="blanco" ancho={140} />
          <div className="min-w-0 flex-1 text-right">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] opacity-80">Propuesta preliminar de flotilla</p>
            <p className="font-display text-[1.9rem] font-semibold leading-none">{organizacion}</p>
            <p className="mt-1 text-[0.8rem] opacity-85">Atención: {p.nombre} · {fechaLarga(hoy())}</p>
          </div>
        </header>

        <div className="grid gap-6 px-8 py-6 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] print:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="grid content-start gap-4">
            {fotoId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/modelos/${fotoId}.jpg`} alt={`BYD ${principal.nombre}`} className="aspect-[4/3] w-full rounded-xl object-cover" />
            ) : null}
            <div className="rounded-xl bg-[#f3f6fa] px-5 py-4 print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
              <p className="text-[0.78rem] font-semibold text-[#5b6472]">Ahorro estimado al año con {unidades} {principal.nombre}</p>
              <p className="num text-[2.9rem] leading-none text-[#0a3d7a]">{dinero(Math.max(0, ahorroPrincipal.ahorroAnual))}</p>
              <p className="mt-1 text-[0.8rem] text-[#5b6472]">{dinero(Math.max(0, ahorroPrincipal.ahorroUnidadMes))} por unidad al mes contra gasolina, con {kmDia} km por día</p>
            </div>
            <div>
              <h2 className="mb-1 text-[0.95rem] font-semibold">Un BYD para cada uso</h2>
              {recomendados.map((r) => fila(`${r.uso} · ${r.nombre}`, `${dinero(r.precio)} público`))}
            </div>
          </div>
          <div className="grid content-start gap-4">
            <div>
              <h2 className="mb-1 text-[0.95rem] font-semibold">Números de la flotilla</h2>
              {fila("Tipo de cliente", tipo)}
              {fila("Unidades", String(unidades))}
              {fila("Modelo principal", `BYD ${principal.nombre} (${principal.motor === "electrico" ? "eléctrico" : "híbrido enchufable"})`)}
              {fila("Precio público por unidad (con IVA)", dinero(principal.precio))}
              {fila("Precio de flotilla por unidad", precioFlotilla ? dinero(precioFlotilla) : "Por autorizar")}
              {fila("Inversión estimada de la flotilla", dinero(precioUnidad * unidades), true)}
              {fila("Ahorro estimado en 5 años", dinero(Math.max(0, ahorroPrincipal.ahorroAnual * 5)), true)}
            </div>
            <div className="rounded-xl border border-[#e3e7ec] px-4 py-3 text-[0.82rem]">
              <p className="font-semibold">{tipo === "Municipio" ? "Contratación" : "Beneficio fiscal"}</p>
              <p className="mt-1 text-[#3b4452]">{tipo === "Municipio"
                ? "Automóviles Tecnológico, S.A. de C.V. participa como proveedor registrado en el padrón del municipio, por el procedimiento que corresponda según la Ley de Adquisiciones de Nuevo León. Esta propuesta no implica pago, comisión ni beneficio alguno a servidores públicos."
                : "La Ley del ISR permite deducir hasta $250,000 por auto eléctrico o híbrido (contra $175,000 de combustión), o hasta $285 diarios en arrendamiento. Información general: confírmelo con su contador."}</p>
            </div>
            <div className="rounded-xl border border-[#e3e7ec] px-4 py-3 text-[0.82rem]">
              <p className="font-semibold">Siguiente paso</p>
              <ul className="mt-1 grid gap-0.5 text-[#3b4452]">
                <li>✓ Diagnóstico de 30 minutos de su operación</li>
                <li>✓ Prueba de manejo para su equipo</li>
                <li>✓ Propuesta final con precio de flotilla autorizado y calendario de entregas</li>
              </ul>
            </div>
            <div className="rounded-xl bg-[#141820] px-4 py-3 text-white print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
              <p className="text-[0.72rem] uppercase tracking-[0.12em] opacity-70">Su asesor de flotillas</p>
              <p className="text-[1.05rem] font-semibold">{asesor?.nombre ?? "BYD Park Point"}</p>
              <p className="text-[0.84rem] opacity-90">{s.agencia.nombre}{tel ? ` · WhatsApp ${tel}` : ""}</p>
            </div>
          </div>
        </div>

        <footer className="border-t border-[#e3e7ec] px-8 py-4 text-[0.68rem] leading-snug text-[#5b6472]">
          Propuesta preliminar e informativa; no constituye oferta. Precios públicos con IVA vigentes al {vigencia(hoy())}. El precio de flotilla requiere autorización de la agencia; crédito y arrendamiento sujetos a aprobación, y toda tasa o mensualidad se entrega con su CAT.
          {" "}El ahorro es una estimación con supuestos: gasolina a {dinero(SUPUESTOS.precioGas)} por litro, rendimiento actual de {SUPUESTOS.rendimiento} km por litro, electricidad a {dinero(SUPUESTOS.precioKwh)} por kWh, {SUPUESTOS.dias} días de uso al mes y mantenimiento estimado; se confirma con los datos reales de su flotilla.
          {" "}Pagos por transferencia; la agencia aplica las disposiciones de prevención de lavado de dinero. Datos tratados conforme al aviso de privacidad de la agencia. Imágenes ilustrativas.
        </footer>
      </article>
    </div>
  );
}
