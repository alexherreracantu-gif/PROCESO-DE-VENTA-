import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { catalogo, equipo, venta as leerVenta } from "@/lib/datos";
import { requerirSesion } from "@/lib/sesion";
import { labelCargo, labelOrigen } from "@/lib/dominio/cuenta";
import { procesoDeVenta } from "@/lib/dominio/proceso";
import { fechaCorta, fechaLarga, hoy } from "@/lib/dominio/fechas";
import { dinero2, porcentaje } from "@/lib/dominio/formato";
import { cx } from "@/components/ui";
import { Logo } from "@/components/marca";
import { BotonImprimir } from "./imprimir";

export const metadata = { title: "Hoja de control" };

/**
 * Hoja de control para el día de la entrega: datos de la unidad, cuenta del cliente al peso,
 * cada pago con su recibo y el checklist del expediente, con espacio para firmas.
 * Se imprime (o se guarda como PDF) y se anexa a la hoja de salida de la agencia.
 */
export default async function HojaControl(props: PageProps<"/hoja/[id]">) {
  const { id } = await props.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await requerirSesion();
  const [v, cat, eq] = await Promise.all([leerVenta(s, id), catalogo(s, true), equipo(s)]);
  if (!v) notFound();
  const p = procesoDeVenta(v, cat.productos);
  const c = p.cuenta;
  const modelo = cat.modelos.find((m) => m.id === v.modelo_id);
  const vendedor = eq.find((x) => x.id === v.vendedor_id);
  const cargos = v.movimientos.filter((m) => m.tipo === "cargo");
  const pagos = v.movimientos.filter((m) => m.tipo === "pago");
  const recibos = (movId: string) => v.documentos.filter((d) => d.movimiento_id === movId).length;

  const dato = (k: string, val: ReactNode) => (
    <div><dt className="text-[0.68rem] font-semibold uppercase tracking-wide text-[#5b6472]">{k}</dt><dd className="m-0 text-[0.86rem] font-medium">{val || "—"}</dd></div>
  );
  const th = "border-b border-[#cfd5dd] px-2 py-1.5 text-left text-[0.66rem] font-semibold uppercase tracking-wide text-[#5b6472]";
  const td = "border-b border-[#e3e7ec] px-2 py-1.5 align-top";

  return (
    <div className="min-h-dvh bg-[#eef1f5] px-4 py-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[860px] flex-wrap items-center gap-3 print:hidden">
        <Link href={`/ventas/${v.id}`} className="text-sm font-semibold text-muted hover:text-fg">← Volver al expediente</Link>
        <span className="flex-1" />
        <BotonImprimir />
      </div>
      <article className="mx-auto max-w-[860px] rounded-2xl bg-white p-8 text-[#141820] shadow-xl print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start gap-4 border-b-2 border-[#0a6fb8] pb-4">
          <Logo tono="azul" ancho={150} />
          <div className="min-w-0 flex-1 text-right">
            <h1 className="font-display text-[1.9rem] font-semibold leading-none">Hoja de control de entrega</h1>
            <p className="mt-1 text-[0.8rem] text-[#5b6472]">{s.agencia.nombre} · Folio #{v.folio} · Impresa el {fechaLarga(hoy())}</p>
          </div>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-4">
          {dato("Cliente", v.cliente)}
          {dato("Número de cliente", v.num_cliente)}
          {dato("Teléfono", v.telefono)}
          {dato("Asesor", vendedor?.nombre)}
          {dato("Unidad", modelo ? `${modelo.nombre} ${modelo.anio}` : null)}
          {dato("Color", `${v.color}${v.color_nombre ? ` · ${v.color_nombre}` : ""}`)}
          {dato("VIN", v.vin ? <span className="font-mono">{v.vin}</span> : null)}
          {dato("Plaza", v.plaza)}
          {dato("Forma de pago", v.forma_pago)}
          {v.forma_pago !== "Contado" ? dato("Crédito", v.credito.monto ? `${v.credito.banco ?? ""} ${dinero2(v.credito.monto)}${v.credito.plazo ? ` · ${v.credito.plazo} m` : ""}${v.credito.tasa != null ? ` · ${v.credito.tasa}%` : ""}` : null) : null}
          {dato("Fecha de venta", fechaCorta(v.fecha))}
          {dato("Entrega", v.fecha_entrega ? fechaCorta(v.fecha_entrega) : null)}
        </section>

        <section className="mt-5 grid gap-5 sm:grid-cols-2 print:grid-cols-2">
          <div>
            <h2 className="mb-1 text-[0.9rem] font-semibold">Cargos</h2>
            <table className="w-full border-collapse text-[0.8rem]">
              <thead><tr><th className={th}>Concepto</th><th className={cx(th, "text-right")}>Monto</th></tr></thead>
              <tbody>
                <tr><td className={td}>Factura de la unidad</td><td className={cx(td, "text-right tabular-nums")}>{v.valor_factura ? dinero2(v.valor_factura) : "FALTA"}</td></tr>
                {cargos.map((m) => <tr key={m.id}><td className={td}>{labelCargo(m.concepto)}{m.notas ? ` · ${m.notas}` : ""}</td><td className={cx(td, "text-right tabular-nums")}>{dinero2(m.monto)}</td></tr>)}
                <tr><td className="px-2 py-1.5 font-semibold">Total a pagar</td><td className="px-2 py-1.5 text-right font-semibold tabular-nums">{dinero2(c.totalCargos)}</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h2 className="mb-1 text-[0.9rem] font-semibold">Pagos</h2>
            <table className="w-full border-collapse text-[0.8rem]">
              <thead><tr><th className={th}>Fecha</th><th className={th}>Pago · recibo</th><th className={cx(th, "text-right")}>Monto</th></tr></thead>
              <tbody>
                {pagos.map((m) => (
                  <tr key={m.id}>
                    <td className={cx(td, "whitespace-nowrap")}>{fechaCorta(m.fecha)}</td>
                    <td className={td}>{labelOrigen(m.concepto)} → {labelCargo(m.aplica_a)}<span className="block text-[0.72rem] text-[#5b6472]">{[m.forma, m.referencia, recibos(m.id) ? "recibo ✓" : m.concepto === "bono" ? null : "SIN RECIBO"].filter(Boolean).join(" · ")}</span></td>
                    <td className={cx(td, "text-right tabular-nums")}>{dinero2(m.monto)}</td>
                  </tr>
                ))}
                {!pagos.length ? <tr><td className={td} colSpan={3}>Sin pagos registrados</td></tr> : null}
                <tr><td className="px-2 py-1.5 font-semibold" colSpan={2}>Total pagado</td><td className="px-2 py-1.5 text-right font-semibold tabular-nums">{dinero2(c.totalPagos)}</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className={cx("mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 print:border print:border-[#141820]", c.sinAdeudo ? "bg-[#e5f5ec] text-[#11683b]" : "bg-[#fdeaea] text-[#a3191c]")}>
          <strong className="text-[1rem]">{!c.completo ? "FALTA EL VALOR FACTURA" : c.sinAdeudo ? (c.saldo > 0 ? `SIN ADEUDO · saldo a favor ${dinero2(c.saldo)}` : "SIN ADEUDO") : `ADEUDO: ${dinero2(-c.saldo)} · EL CARRO NO SALE`}</strong>
          <span className="text-[0.82rem] font-semibold">Expediente {porcentaje(p.pct)} · {p.hechos}/{p.total}</span>
        </div>

        <section className="mt-5">
          <h2 className="mb-1.5 text-[0.9rem] font-semibold">Checklist del expediente</h2>
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 print:grid-cols-2">
            {p.etapas.map((et) => (
              <div key={et.id} className="break-inside-avoid">
                <p className="mb-0.5 text-[0.74rem] font-semibold uppercase tracking-wide text-[#0a6fb8]">{et.label} · {et.hechos}/{et.total}</p>
                <ul className="grid gap-0.5 text-[0.8rem]">
                  {et.requisitos.map((r) => (
                    <li key={r.id} className="flex items-baseline gap-2">
                      <span className={cx("inline-grid size-4 shrink-0 translate-y-[2px] place-items-center rounded border text-[0.66rem] font-bold", r.estado === "hecho" ? "border-[#11683b] bg-[#11683b] text-white" : r.estado === "na" ? "border-[#9aa3ae] text-[#9aa3ae]" : "border-[#a3191c] text-[#a3191c]")}>
                        {r.estado === "hecho" ? "✓" : r.estado === "na" ? "–" : ""}
                      </span>
                      <span className={cx(r.estado === "na" && "text-[#9aa3ae] line-through")}>{r.label}</span>
                      {r.estado === "hecho" && r.detalle ? <span className="text-[0.72rem] text-[#5b6472]">· {r.detalle}</span> : null}
                      {r.estado === "pendiente" ? <span className="text-[0.72rem] font-semibold text-[#a3191c]">· pendiente</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4 print:grid-cols-4">
          {["Asesor", "Gerente de ventas", "Caja", "Cliente"].map((f) => (
            <div key={f} className="border-t border-[#141820] pt-1 text-center text-[0.74rem] font-semibold">{f}</div>
          ))}
        </section>
      </article>
    </div>
  );
}
