import Link from "next/link";
import { CalendarX, Check } from "lucide-react";
import { catalogo, equipo, ventasConEntrega, ventasEnProceso } from "@/lib/datos";
import { requerirSesion } from "@/lib/sesion";
import { procesoDeVenta } from "@/lib/dominio/proceso";
import { fechaCorta, fechaLarga, hoy, sumarDias } from "@/lib/dominio/fechas";
import { textoSaldo } from "@/lib/dominio/seguimiento";
import { cx, Encabezado, Pastilla, Progreso, Tarjeta, TituloTarjeta, Vacio } from "@/components/ui";
import type { Venta } from "@/lib/tipos";

export const metadata = { title: "Entregas" };

const DIA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default async function Entregas() {
  const s = await requerirSesion();
  const fecha = hoy();
  const [cat, eq, abiertas, conFecha] = await Promise.all([
    catalogo(s, true), equipo(s), ventasEnProceso(s), ventasConEntrega(s, sumarDias(fecha, -7), sumarDias(fecha, 45)),
  ]);
  const corto = new Map(eq.map((p) => [p.id, p.nombre_corto]));
  const modelo = new Map(cat.modelos.map((m) => [m.id, `${m.nombre} ${m.anio}`]));
  const todas = new Map<string, Venta>([...conFecha, ...abiertas].map((v) => [v.id, v]));
  const lista = [...todas.values()];

  const atrasadas = lista.filter((v) => v.fecha_entrega && v.fecha_entrega < fecha && v.estatus !== "entregada");
  const sinFecha = lista.filter((v) => !v.fecha_entrega && v.estatus !== "entregada");
  const porDia = new Map<string, Venta[]>();
  for (const v of lista) {
    if (!v.fecha_entrega || (v.fecha_entrega < fecha && v.estatus !== "entregada")) continue;
    porDia.set(v.fecha_entrega, [...(porDia.get(v.fecha_entrega) ?? []), v]);
  }
  const dias = [...porDia.keys()].sort();
  const proximas = dias.filter((d) => d >= fecha);
  const recientes = dias.filter((d) => d < fecha).reverse();
  const tira = Array.from({ length: 14 }, (_, i) => sumarDias(fecha, i));

  const fila = (v: Venta, nota?: string) => {
    const p = procesoDeVenta(v, cat.productos);
    const faltan = p.pendientes.filter((x) => x.id !== "entrega").length;
    const entregada = v.estatus === "entregada";
    return (
      <li key={v.id} className="border-t border-line first:border-0">
        <Link href={`/ventas/${v.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 hover:opacity-80">
          <span className={cx("grid size-8 shrink-0 place-items-center rounded-full", entregada || p.listoParaSalida ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn")}>
            {entregada || p.listoParaSalida ? <Check className="size-4" strokeWidth={3} /> : <span className="text-[0.74rem] font-bold">{faltan}</span>}
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block truncate">{v.cliente}</strong>
            <span className="block truncate text-[0.8rem] text-muted">{modelo.get(v.modelo_id) ?? "—"} · {v.color}{s.direccion ? ` · ${corto.get(v.vendedor_id) ?? ""}` : ""}</span>
            {nota ? <span className="block text-[0.76rem] font-semibold text-bad">{nota}</span> : null}
          </span>
          <span className="grid w-full justify-items-end gap-1 sm:w-44">
            <Pastilla tono={entregada ? "ok" : p.listoParaSalida ? "ok" : faltan > 5 ? "bad" : "warn"}>
              {entregada ? "Entregada" : p.listoParaSalida ? "Lista para entregar" : `Faltan ${faltan}`}
            </Pastilla>
            {!entregada && p.cuenta.completo && !p.cuenta.sinAdeudo ? (() => { const t = textoSaldo(v.forma_pago, p.cuenta); return <span className={cx("text-[0.74rem] font-semibold", t.tono === "bad" ? "text-bad" : "text-warn")}>{t.texto}</span>; })() : null}
            {!entregada ? <Progreso valor={p.pct} className="h-1.5 w-full max-w-44" /> : null}
          </span>
        </Link>
      </li>
    );
  };

  return (
    <>
      <Encabezado eyebrow="Operación" titulo="Entregas"
        descripcion={`${s.direccion ? "Las entregas del equipo" : "Tus entregas"} de los próximos días, con lo que le falta a cada expediente para que el carro salga.`} />

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {tira.map((d) => {
          const n = porDia.get(d)?.length ?? 0;
          const dt = new Date(`${d}T12:00:00Z`);
          return (
            <a key={d} href={n ? `#d-${d}` : undefined} className={cx("grid min-w-[58px] flex-1 justify-items-center gap-0.5 rounded-xl border px-2 py-2 text-center transition",
              d === fecha ? "border-accent bg-accent-soft" : "border-line bg-surface", n ? "hover:-translate-y-0.5 hover:shadow-md" : "opacity-70")}>
              <span className="text-[0.68rem] font-semibold uppercase text-muted">{DIA[dt.getUTCDay()]}</span>
              <span className="num text-[1.4rem] leading-none">{dt.getUTCDate()}</span>
              <span className={cx("h-4 text-[0.68rem] font-bold", n ? "text-accent" : "text-transparent")}>{n ? `${n} ${n === 1 ? "auto" : "autos"}` : "·"}</span>
            </a>
          );
        })}
      </div>

      {atrasadas.length ? (
        <Tarjeta className="border-bad/40">
          <TituloTarjeta titulo="Atrasadas" nota="La fecha ya pasó y no se ha entregado: reprograma o completa el expediente" />
          <ul className="grid grid-cols-[minmax(0,1fr)]">{atrasadas.map((v) => fila(v, `Era el ${fechaCorta(v.fecha_entrega)}`))}</ul>
        </Tarjeta>
      ) : null}

      {proximas.length ? proximas.map((d) => (
        <Tarjeta key={d} id={`d-${d}`} className="scroll-mt-20">
          <TituloTarjeta titulo={`${fechaLarga(d)}${d === fecha ? " · Hoy" : d === sumarDias(fecha, 1) ? " · Mañana" : ""}`} nota={`${porDia.get(d)!.length} ${porDia.get(d)!.length === 1 ? "entrega" : "entregas"}`} />
          <ul className="grid grid-cols-[minmax(0,1fr)]">{porDia.get(d)!.map((v) => fila(v))}</ul>
        </Tarjeta>
      )) : (
        <Vacio titulo="Sin entregas programadas">Programa la fecha en cada expediente, en el recuadro “Día de la entrega”.</Vacio>
      )}

      {sinFecha.length ? (
        <Tarjeta>
          <TituloTarjeta titulo={<span className="inline-flex items-center gap-2"><CalendarX className="size-4 text-muted" />Sin fecha de entrega</span>} nota={`${sinFecha.length} expedientes abiertos`} />
          <ul className="grid grid-cols-[minmax(0,1fr)]">{sinFecha.map((v) => fila(v))}</ul>
        </Tarjeta>
      ) : null}

      {recientes.length ? (
        <Tarjeta>
          <TituloTarjeta titulo="Entregadas esta semana" />
          <ul className="grid grid-cols-[minmax(0,1fr)]">{recientes.flatMap((d) => porDia.get(d)!).map((v) => fila(v))}</ul>
        </Tarjeta>
      ) : null}
    </>
  );
}
