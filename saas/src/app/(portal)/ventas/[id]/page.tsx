import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { contextoVenta, historialVenta, venta as leerVenta } from "@/lib/datos";
import { requerirSesion } from "@/lib/sesion";
import { avanceExpediente, colorHex, estatusInfo } from "@/lib/dominio/catalogos";
import { fechaCorta, fechaLarga } from "@/lib/dominio/fechas";
import { dinero } from "@/lib/dominio/formato";
import { Encabezado, MuestraColor, Pastilla, Progreso, Tarjeta, TituloTarjeta } from "@/components/ui";
import { AccionesVenta, Cuadre, Expediente } from "./cliente";

export const metadata = { title: "Venta" };

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
  const av = avanceExpediente(v.forma_pago, v.expediente);
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

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Tarjeta>
          <TituloTarjeta titulo="Datos de la venta" />
          <dl className="grid gap-4 sm:grid-cols-2">
            {dato("Número de cliente", v.num_cliente)}
            {dato("VIN", v.vin ? <span className="font-mono text-[0.9rem] tracking-wide">{v.vin}</span> : null)}
            {dato("Modelo", modelo ? `${modelo.nombre} ${modelo.anio}` : null)}
            {dato("Color", <span className="inline-flex items-center gap-1.5"><MuestraColor hex={colorHex(v.color)} />{v.color}{v.color_nombre ? ` · ${v.color_nombre}` : ""}</span>)}
            {dato("Forma de pago", v.forma_pago)}
            {dato("Plaza", v.plaza)}
            {dato("Fecha de entrega", v.fecha_entrega ? fechaLarga(v.fecha_entrega) : null)}
            {dato("Valor factura", v.valor_factura != null ? dinero(v.valor_factura) : null)}
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

        <Tarjeta>
          <TituloTarjeta titulo="Expediente" nota={`${av.hechos} de ${av.total} pasos`} />
          <Progreso valor={av.pct} className="mb-4" />
          <Expediente ventaId={v.id} formaPago={v.forma_pago} expediente={v.expediente} />
        </Tarjeta>
      </div>

      <Tarjeta>
        <TituloTarjeta titulo="Cuadre sin adeudo" nota={v.forma_pago === "Contado" ? "Venta de contado" : `Crédito · ${v.forma_pago}`} />
        <Cuadre venta={v} separacionDefault={s.agencia.parametros.separacion ?? 5000} />
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
                  <span>{h.accion === "insert" ? "registró la venta" : h.accion === "delete" ? "borró la venta" : `actualizó · estatus ${estatusInfo(String(h.datos?.estatus ?? "")).label.toLowerCase()}`}</span>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-muted">Sin cambios registrados.</p>}
        </Tarjeta>
      ) : null}
    </>
  );
}
