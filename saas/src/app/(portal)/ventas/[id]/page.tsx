import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { contextoVenta, historialVenta, venta as leerVenta, type CambioVenta } from "@/lib/datos";
import { labelCargo, labelOrigen } from "@/lib/dominio/cuenta";
import { requerirSesion } from "@/lib/sesion";
import { colorHex, estatusInfo } from "@/lib/dominio/catalogos";
import { procesoDeVenta } from "@/lib/dominio/proceso";
import { fechaCorta, fechaLarga } from "@/lib/dominio/fechas";
import { dinero, dinero2, porcentaje } from "@/lib/dominio/formato";
import { BotonEnlace, cx, Encabezado, MuestraColor, Pastilla, Progreso, Tarjeta, TituloTarjeta } from "@/components/ui";
import { ProcesoVenta } from "@/components/expediente/proceso";
import { CuentaCliente } from "@/components/expediente/cuenta";
import { AccionesVenta } from "./cliente";

export const metadata = { title: "Venta" };

function describirCambio(h: CambioVenta): string {
  const d = h.datos ?? {};
  if (h.tabla === "venta_documentos") return `${h.accion === "delete" ? "quitó" : "subió"} ${String(d.nombre ?? "un archivo")}${d.tipo === "recibo" ? " (recibo)" : ""}`;
  if (h.tabla === "venta_movimientos") {
    const que = d.tipo === "cargo" ? `cargo de ${labelCargo(String(d.concepto))}` : `pago (${labelOrigen(String(d.concepto)).toLowerCase()})`;
    const verbo = h.accion === "insert" ? "registró" : h.accion === "delete" ? "borró" : "editó";
    return `${verbo} ${que} por ${dinero2(Number(d.monto ?? 0))}`;
  }
  return h.accion === "insert" ? "registró la venta" : h.accion === "delete" ? "borró la venta" : `actualizó la venta · ${estatusInfo(String(d.estatus ?? "")).label.toLowerCase()}`;
}

export default async function DetalleVenta(props: PageProps<"/ventas/[id]">) {
  const { id } = await props.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await requerirSesion();
  const [v, ctx] = await Promise.all([leerVenta(s, id), contextoVenta(s)]);
  if (!v) notFound();
  const historial = s.direccion ? await historialVenta(s, id) : [];
  const { catalogo, equipo, ...ctxFormulario } = ctx;
  const modelo = catalogo.modelos.find((m) => m.id === v.modelo_id);
  const vendedor = equipo.find((p) => p.id === v.vendedor_id);
  const nombre = (uid: string | null) => equipo.find((p) => p.id === uid)?.nombre_corto ?? "Sistema";
  const est = estatusInfo(v.estatus);
  const p = procesoDeVenta(v, catalogo.productos);
  const c = p.cuenta;
  const cargosPendientes = p.etapas.flatMap((e) => e.requisitos).some((r) => r.id === "cargos" && r.estado === "pendiente" && c.completo);
  const productos = catalogo.productos.filter((p) => v.productos.includes(p.id));
  const totalProductos = productos.reduce((t, p) => t + (p.precio ?? 0), 0);

  const dato = (k: string, val: ReactNode) => (
    <div className="grid gap-0.5"><dt className="text-[0.76rem] font-semibold text-muted">{k}</dt><dd className="m-0">{val || "—"}</dd></div>
  );

  return (
    <>
      <Link href="/ventas" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg"><ArrowLeft className="size-4" />Ventas</Link>
      <Encabezado eyebrow={`Folio #${v.folio} · ${fechaLarga(v.fecha)}`} titulo={v.cliente}
        descripcion={`${modelo ? `${modelo.nombre} ${modelo.anio}` : "Modelo"} · ${v.color}${v.color_nombre ? ` (${v.color_nombre})` : ""} · vendió ${vendedor?.nombre ?? "—"}`}>
        <Pastilla tono={est.tono} className="text-[0.8rem]">{est.label}</Pastilla>
        <AccionesVenta venta={v} ctx={ctxFormulario} puedeBorrar={s.direccion} />
      </Encabezado>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-card">
          <p className="text-[0.8rem] font-medium text-muted">Expediente</p>
          <p className="num text-[2.2rem]">{porcentaje(p.pct)}</p>
          <Progreso valor={p.pct} className="mt-1 h-1.5" />
          <p className="mt-1.5 text-[0.78rem] text-muted">{p.hechos} de {p.total} requisitos</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-card">
          <p className="text-[0.8rem] font-medium text-muted">Sigue</p>
          <p className="mt-1 text-[1.05rem] font-semibold leading-snug">{p.siguiente?.label ?? "Todo completo"}</p>
          <p className="mt-1 text-[0.78rem] text-muted">{p.siguiente ? p.etapas.find((e) => e.requisitos.some((r) => r.id === p.siguiente?.id))?.label : "Expediente al 100%"}</p>
        </div>
        <div className={cx("rounded-2xl border px-4 py-3.5 shadow-card", !c.completo ? "border-line bg-surface" : c.sinAdeudo ? "border-transparent bg-ok-soft text-ok" : "border-transparent bg-bad-soft text-bad")}>
          <p className="text-[0.8rem] font-medium opacity-80">{!c.completo ? "Cuenta" : c.sinAdeudo ? "Sin adeudo" : "Falta por pagar"}</p>
          <p className="num text-[2.2rem]">{c.completo ? dinero2(Math.abs(c.saldo)) : "—"}</p>
          <p className="text-[0.78rem] opacity-80">{c.completo ? `Pagado ${dinero(c.totalPagos)} de ${dinero(c.totalCargos)}` : "Captura el valor factura"}</p>
        </div>
        <div className={cx("rounded-2xl border px-4 py-3.5 shadow-card", p.listoParaSalida ? "border-transparent bg-ok-soft text-ok" : "border-line bg-surface")}>
          <p className="text-[0.8rem] font-medium opacity-80">Día de la entrega</p>
          <p className="mt-1 text-[1.05rem] font-semibold leading-snug">{v.estatus === "entregada" ? `Entregada${v.fecha_entrega ? ` el ${fechaCorta(v.fecha_entrega)}` : ""}` : p.listoParaSalida ? "Listo para entregar" : `Faltan ${p.pendientes.filter((x) => x.id !== "entrega").length} pendientes`}</p>
          <p className="mt-1 text-[0.78rem] opacity-80">{v.fecha_entrega && v.estatus !== "entregada" ? `Programada: ${fechaLarga(v.fecha_entrega)}` : "Imprime la hoja de control para la salida."}</p>
        </div>
      </div>

      <Tarjeta>
        <TituloTarjeta titulo="Proceso del cliente" nota={v.forma_pago === "Contado" ? "Venta de contado" : `Crédito · ${v.forma_pago}${v.plaza === "Piedras Negras" ? " · Piedras Negras" : ""}`}>
          <BotonEnlace href={`/hoja/${v.id}`} variante="secundario" tamano="sm" icono={Printer} externo>Hoja de control</BotonEnlace>
        </TituloTarjeta>
        <ProcesoVenta ventaId={v.id} proceso={p} documentos={v.documentos} credito={v.credito} direccion={s.direccion} />
      </Tarjeta>

      <Tarjeta id="cuenta" className="scroll-mt-20">
        <TituloTarjeta titulo="Cuenta del cliente" nota="Cargos y pagos al peso, con su recibo" />
        <CuentaCliente ventaId={v.id} valorFactura={v.valor_factura} movimientos={v.movimientos} documentos={v.documentos} cuenta={c} credito={v.credito}
          contado={v.forma_pago === "Contado"} faltanCargos={cargosPendientes} separacionDefault={s.agencia.parametros.separacion ?? 5000} />
      </Tarjeta>

      <Tarjeta>
        <TituloTarjeta titulo="Datos de la venta" />
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {dato("Número de cliente", v.num_cliente)}
          {dato("VIN", v.vin ? <span className="font-mono text-[0.9rem] tracking-wide">{v.vin}</span> : null)}
          {dato("Modelo", modelo ? `${modelo.nombre} ${modelo.anio}` : null)}
          {dato("Color", <span className="inline-flex items-center gap-1.5"><MuestraColor hex={colorHex(v.color)} />{v.color}{v.color_nombre ? ` · ${v.color_nombre}` : ""}</span>)}
          {dato("Forma de pago", v.forma_pago)}
          {dato("Plaza", v.plaza)}
          {dato("Fecha de entrega", v.fecha_entrega ? fechaLarga(v.fecha_entrega) : null)}
          {dato("Valor factura", v.valor_factura != null ? dinero2(v.valor_factura) : null)}
          {dato("Teléfono", v.telefono)}
          {dato("Vendedor", vendedor?.nombre)}
        </dl>
        <div className="mt-5 border-t border-line pt-4">
          <p className="mb-2 text-[0.76rem] font-semibold text-muted">Productos vendidos · {productos.length} de {catalogo.productos.length}{totalProductos ? ` · ${dinero(totalProductos)} a precio de catálogo` : ""}</p>
          <div className="flex flex-wrap gap-1.5">
            {catalogo.productos.map((p) => <Pastilla key={p.id} tono={v.productos.includes(p.id) ? "acc" : "neutro"} className={v.productos.includes(p.id) ? "" : "line-through opacity-60"}>{p.nombre}</Pastilla>)}
          </div>
        </div>
        {v.notas ? <p className="mt-4 whitespace-pre-wrap rounded-xl bg-surface-2 px-4 py-3 text-sm">{v.notas}</p> : null}
      </Tarjeta>

      {s.direccion ? (
        <Tarjeta>
          <TituloTarjeta titulo="Historial de cambios" nota="Visible solo para dirección" />
          {historial.length ? (
            <ol className="grid gap-2 text-sm grid-cols-[minmax(0,1fr)]">
              {historial.map((h) => (
                <li key={h.id} className="flex flex-wrap gap-x-2 border-b border-line pb-2 last:border-0">
                  <span className="text-muted">{fechaCorta(h.created_at.slice(0, 10))} · {new Date(h.created_at).toLocaleTimeString("es-MX", { timeZone: "America/Monterrey", hour: "2-digit", minute: "2-digit" })}</span>
                  <strong>{nombre(h.usuario_id)}</strong>
                  <span>{describirCambio(h)}</span>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-muted">Sin cambios registrados.</p>}
        </Tarjeta>
      ) : null}
    </>
  );
}
