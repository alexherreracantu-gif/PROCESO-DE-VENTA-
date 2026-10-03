import Link from "next/link";
import { notFound } from "next/navigation";
import { catalogo } from "@/lib/datos";
import { requerirSesion } from "@/lib/sesion";
import { cotizar, PLAZOS } from "@/lib/dominio/banorte";
import { fechaLarga, hoy } from "@/lib/dominio/fechas";
import { dinero, dinero2 } from "@/lib/dominio/formato";
import { telefonoBonito, vigencia } from "@/lib/anuncios";
import { fuenteFoto } from "@/lib/fotos";
import { FOTOS_INCLUIDAS } from "@/lib/fotos-incluidas";
import { cx } from "@/components/ui";
import { Logo } from "@/components/marca";
import { BotonImprimir } from "@/app/hoja/[id]/imprimir";

export const metadata = { title: "Cotización" };

const num = (v: string | string[] | undefined, def = 0) => {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) && n >= 0 ? n : def;
};

/**
 * Cotización formal para el cliente: foto del auto, números Banorte, plazos y datos del asesor.
 * Se abre desde el cotizador; se imprime o se guarda como PDF para mandarla por WhatsApp.
 */
export default async function Cotizacion(props: PageProps<"/cotizacion">) {
  const s = await requerirSesion();
  const sp = await props.searchParams;
  const { modelos } = await catalogo(s);
  const modelo = modelos.find((m) => m.id === sp.m);
  if (!modelo) notFound();
  const pa = s.agencia.parametros;
  const plazo = (PLAZOS as readonly number[]).includes(num(sp.pl)) ? num(sp.pl) : 72;
  const garantia = sp.gar === "1" ? pa.garantia_extendida ?? 9082 : 0;
  const base = {
    modelo, aportacion: num(sp.ap), accesorios: num(sp.acc), garantia, plazo,
    placas: modelo.motor === "electrico" ? pa.placas_electrico ?? 1760 : pa.placas_hibrido ?? 5866,
    tramites: sp.gest === "1" ? pa.gestoria ?? 3016 : 0,
  };
  const q = cotizar(base);
  const plazos = PLAZOS.filter((n) => n >= 36).map((n) => ({ n, m: cotizar({ ...base, plazo: n }).mensualidad }));
  const { data: fotos } = await s.sb.from("modelo_fotos").select("posicion, updated_at").eq("modelo_id", modelo.id).eq("posicion", 1);
  const foto = fuenteFoto({ id: modelo.id, fotos: Object.fromEntries((fotos ?? []).map((f) => [f.posicion, new Date(f.updated_at).getTime()])), incluidas: FOTOS_INCLUIDAS[modelo.clave] ?? {} }, 1);
  const cliente = typeof sp.cli === "string" ? sp.cli.slice(0, 80) : "";
  const asesor = s.perfil.rol === "ceo" ? "BYD Park Point" : s.perfil.nombre;
  const tel = telefonoBonito(s.perfil.telefono);
  const fila = (k: string, v: string, fuerte?: boolean) => (
    <div className="flex justify-between gap-4 border-b border-[#e3e7ec] py-1.5 text-[0.86rem] last:border-0"><span className="text-[#5b6472]">{k}</span><span className={cx("text-right tabular-nums", fuerte && "font-semibold")}>{v}</span></div>
  );

  return (
    <div className="min-h-dvh bg-[#eef1f5] px-4 py-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[820px] flex-wrap items-center gap-3 print:hidden">
        <Link href="/cotizador" className="text-sm font-semibold text-muted hover:text-fg">← Volver al cotizador</Link>
        <span className="flex-1" />
        <span className="text-[0.8rem] text-muted">En el celular: Compartir → Imprimir → guardar PDF y mándalo por WhatsApp.</span>
        <BotonImprimir />
      </div>
      <article className="mx-auto max-w-[820px] overflow-hidden rounded-2xl bg-white text-[#141820] shadow-xl print:max-w-none print:rounded-none print:shadow-none">
        <header className="flex flex-wrap items-center gap-4 bg-[linear-gradient(120deg,#0a3d7a,#0a6fb8)] px-8 py-5 text-white print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
          <Logo tono="blanco" ancho={140} />
          <div className="min-w-0 flex-1 text-right">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] opacity-80">Cotización</p>
            <p className="font-display text-[1.9rem] font-semibold leading-none">BYD {modelo.nombre} {modelo.anio}</p>
            <p className="mt-1 text-[0.8rem] opacity-85">{cliente ? `Para ${cliente} · ` : ""}{fechaLarga(hoy())}</p>
          </div>
        </header>

        <div className="grid gap-6 px-8 py-6 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] print:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="grid content-start gap-4">
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto.grande} alt={`BYD ${modelo.nombre}`} className="aspect-[4/3] w-full rounded-xl object-cover" />
            ) : null}
            <div className="rounded-xl bg-[#f3f6fa] px-5 py-4 print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
              <p className="text-[0.78rem] font-semibold text-[#5b6472]">Mensualidad a {plazo} meses</p>
              <p className="num text-[2.9rem] leading-none text-[#0a3d7a]">{dinero2(q.mensualidad)}</p>
              <p className="mt-1 text-[0.8rem] text-[#5b6472]">Tasa fija anual {(q.convenio.tasa * 100).toFixed(2)}% · Banorte {q.convenio.nombre}</p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {plazos.map((x) => (
                <div key={x.n} className={cx("rounded-lg border px-1 py-2", x.n === plazo ? "border-[#0a6fb8] bg-[#e8f2fb]" : "border-[#e3e7ec]")}>
                  <p className="text-[0.68rem] text-[#5b6472]">{x.n} meses</p>
                  <p className="text-[0.84rem] font-semibold tabular-nums">{dinero(x.m)}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid content-start gap-4">
            <div>
              <h2 className="mb-1 text-[0.95rem] font-semibold">Números de tu compra</h2>
              {fila("Precio de lista", dinero(modelo.precio))}
              {base.accesorios ? fila("Accesorios", dinero(base.accesorios)) : null}
              {garantia ? fila("Garantía extendida 6 años", dinero(garantia)) : null}
              {fila("Tu enganche", dinero(base.aportacion))}
              {q.bonoAplica ? fila("Bono BYD", `+ ${dinero(q.bono)}`) : null}
              {fila(`Enganche total (${(q.pctEnganche * 100).toFixed(0)}%)`, dinero(q.enganche), true)}
              {fila("Monto a financiar", dinero2(q.monto))}
              {fila("Pago aproximado a la firma", dinero2(q.pagoFirma), true)}
            </div>
            <div className="rounded-xl border border-[#e3e7ec] px-4 py-3 text-[0.82rem]">
              <p className="font-semibold">Incluye</p>
              <ul className="mt-1 grid gap-0.5 text-[#3b4452]">
                <li>✓ Garantía de fábrica BYD</li>
                {garantia ? <li>✓ Garantía extendida a 6 años, kilometraje ilimitado</li> : null}
                <li>✓ Placas de Nuevo León{base.tramites ? " y gestoría" : " (pago a la firma)"}</li>
                <li>✓ Prueba de manejo y entrega personalizada</li>
              </ul>
            </div>
            <div className="rounded-xl bg-[#141820] px-4 py-3 text-white print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
              <p className="text-[0.72rem] uppercase tracking-[0.12em] opacity-70">Tu asesor</p>
              <p className="text-[1.05rem] font-semibold">{asesor}</p>
              <p className="text-[0.84rem] opacity-90">{s.agencia.nombre}{tel ? ` · WhatsApp ${tel}` : ""}</p>
            </div>
          </div>
        </div>

        <footer className="border-t border-[#e3e7ec] px-8 py-4 text-[0.68rem] leading-snug text-[#5b6472]">
          Cotización informativa, sujeta a autorización de crédito por Banorte (Plan Tradicional). Mensualidad aproximada, no incluye seguros de auto y de vida; el pago a la firma incluye comisión por apertura y placas{base.tramites ? " y gestoría" : ""}.
          {q.bonoAplica ? " El bono aplica financiando desde 5% de enganche." : ""} Precios con IVA. Vigencia al {vigencia(hoy())} o hasta agotar existencias.
        </footer>
      </article>
    </div>
  );
}
