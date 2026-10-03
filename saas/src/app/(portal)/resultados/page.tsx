import { catalogo, equipo, ventasDelMes } from "@/lib/datos";
import { requerirSesion } from "@/lib/sesion";
import { esMes, mesActual, nombreMes, rangoMes } from "@/lib/dominio/fechas";
import { dinero, porcentaje } from "@/lib/dominio/formato";
import { resultadosPorCanal, type FilaCanal } from "@/lib/dominio/publicidad";
import { comisionVenta, esquemaVacio } from "@/lib/dominio/seguimiento";
import { Aviso, cx, Encabezado, Indicador, Segmentos, Tabla, Tarjeta, TituloTarjeta, Vacio } from "@/components/ui";
import { SelectorMes } from "@/components/selector-mes";
import { FormInversion } from "./formulario";

export const metadata = { title: "Resultados de anuncios" };

const CANALES_PAGO = ["Meta Ads", "Instagram", "Google", "Landing"];

export default async function Resultados(props: PageProps<"/resultados">) {
  const s = await requerirSesion();
  const sp = await props.searchParams;
  const mes = esMes(sp.mes as string) ? (sp.mes as string) : mesActual();
  const { desde, hasta } = rangoMes(mes);
  const [cat, eq] = await Promise.all([catalogo(s, true), equipo(s)]);
  const vendedores = eq.filter((p) => p.vende && p.activo);
  const quien = s.direccion ? (sp.quien === "equipo" ? "equipo" : typeof sp.quien === "string" && vendedores.some((v) => v.id === sp.quien) ? sp.quien : s.perfil.vende ? s.perfil.id : "equipo") : s.perfil.id;
  const persona = quien === "equipo" ? null : quien;

  let qp = s.sb.from("prospectos").select("origen").gte("created_at", `${desde}T00:00:00-06:00`).lt("created_at", `${hasta}T00:00:00-06:00`).limit(5000);
  let qi = s.sb.from("inversion_publicidad").select("usuario_id, canal, monto").eq("mes", desde);
  if (persona) { qp = qp.eq("asesor_id", persona); qi = qi.eq("usuario_id", persona); }
  const [ventas, pros, inv] = await Promise.all([ventasDelMes(s, mes, persona), qp, qi]);
  const esquema = s.agencia.parametros.comisiones ?? {};
  const vivas = ventas.filter((v) => v.estatus !== "cancelada");
  const r = resultadosPorCanal({
    prospectos: (pros.data ?? []) as { origen: string | null }[],
    ventas: vivas.map((v) => ({ origen: v.origen, comision: comisionVenta(esquema, v, cat.productos).total })),
    inversion: ((inv.data ?? []) as { canal: string; monto: number }[]).map((x) => ({ canal: x.canal, monto: Number(x.monto) })),
  });
  const mia = ((inv.data ?? []) as { usuario_id: string; canal: string; monto: number }[]).filter((x) => x.usuario_id === s.perfil.id);
  const canalesForm = [...new Set([...CANALES_PAGO, ...mia.map((x) => x.canal)])].map((c) => ({ canal: c, monto: mia.find((x) => x.canal === c) ? Number(mia.find((x) => x.canal === c)!.monto) : null }));
  const sinOrigen = vivas.filter((v) => !v.origen).length;
  const mejor = r.filas.filter((f) => f.inversion > 0 && f.costoVenta != null).sort((a, b) => a.costoVenta! - b.costoVenta!)[0];
  const enlace = (q: string) => `/resultados?mes=${mes}&quien=${q}`;
  const cifra = (v: number | null, f: (x: number) => string) => (v == null ? <span className="text-subtle">—</span> : f(v));
  const filaTabla = (f: FilaCanal, total = false) => (
    <tr key={f.canal} className={total ? "font-semibold [&_td]:border-t-2 [&_td]:border-line" : undefined}>
      <td className="whitespace-nowrap">{f.canal}{mejor?.canal === f.canal && !total ? <span className="ml-2 rounded-full bg-ok-soft px-2 py-0.5 text-[0.7rem] font-semibold text-ok">Más barato</span> : null}</td>
      <td className="text-right">{f.prospectos}</td>
      <td className="text-right">{f.ventas}</td>
      <td className="text-right">{cifra(f.conversion, porcentaje)}</td>
      <td className="text-right">{f.inversion ? dinero(f.inversion) : <span className="text-subtle">—</span>}</td>
      <td className="text-right">{cifra(f.costoProspecto, dinero)}</td>
      <td className="text-right">{cifra(f.costoVenta, dinero)}</td>
      <td className="text-right">{f.comision ? dinero(f.comision) : <span className="text-subtle">—</span>}</td>
      <td className={cx("text-right", f.retorno != null && (f.retorno >= 0 ? "text-ok" : "text-bad"))}>{cifra(f.retorno, dinero)}</td>
    </tr>
  );

  return (
    <>
      <Encabezado eyebrow="Vender" titulo="Resultados de anuncios"
        descripcion="De dónde vienen tus prospectos y tus ventas, cuánto pusiste en publicidad y cuánto te cuesta cada venta. Así sabes dónde meter el dinero." />
      <div className="flex flex-wrap items-center gap-3">
        <SelectorMes mes={mes} base="/resultados" extra={{ quien }} />
        {s.direccion ? <Segmentos etiqueta="Quién" actual={quien} opciones={[{ valor: "equipo", texto: "Equipo", href: enlace("equipo") }, ...vendedores.map((v) => ({ valor: v.id, texto: v.nombre_corto, href: enlace(v.id) }))]} /> : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador etiqueta="Invertido en publicidad" valor={dinero(r.total.inversion)} nota={nombreMes(mes)} />
        <Indicador etiqueta="Prospectos" valor={r.total.prospectos} nota={r.total.costoProspecto != null ? `${dinero(r.total.costoProspecto)} cada uno` : "Sin inversión capturada"} />
        <Indicador etiqueta="Costo por venta" valor={r.total.costoVenta != null ? dinero(r.total.costoVenta) : "—"} nota={`${r.total.ventas} ${r.total.ventas === 1 ? "venta" : "ventas"} · conversión ${r.total.conversion != null ? porcentaje(r.total.conversion) : "—"}`} />
        <Indicador etiqueta="Ganancia sobre publicidad" valor={r.total.retorno != null ? dinero(r.total.retorno) : "—"} tono={r.total.retorno == null ? undefined : r.total.retorno >= 0 ? "ok" : "bad"} nota={esquemaVacio(esquema) ? "Captura el esquema en Mis comisiones" : `Comisiones ${dinero(r.total.comision)} − inversión`} />
      </div>

      {sinOrigen ? <Aviso tono="warn">{sinOrigen === 1 ? "1 venta del mes no tiene" : `${sinOrigen} ventas del mes no tienen`} anotado de dónde llegó el cliente. Edítalas y elige el origen para que los números salgan completos.</Aviso> : null}

      <Tarjeta>
        <TituloTarjeta titulo="Por canal" nota={mejor ? `${mejor.canal} es tu canal más barato por venta` : undefined} />
        {r.filas.length ? (
          <Tabla>
            <thead><tr><th>Canal</th><th className="text-right!">Prospectos</th><th className="text-right!">Ventas</th><th className="text-right!">Conversión</th><th className="text-right!">Inversión</th><th className="text-right!">Por prospecto</th><th className="text-right!">Por venta</th><th className="text-right!">Comisiones</th><th className="text-right!">Ganancia</th></tr></thead>
            <tbody>{r.filas.map((f) => filaTabla(f))}{filaTabla(r.total, true)}</tbody>
          </Tabla>
        ) : <Vacio titulo={`Sin datos en ${nombreMes(mes)}`}>Los prospectos de la landing y de Meta llegan solos con su origen; en cada venta elige de dónde llegó el cliente.</Vacio>}
      </Tarjeta>

      {quien === s.perfil.id ? (
        <Tarjeta>
          <TituloTarjeta titulo={`Tu inversión de ${nombreMes(mes)}`} nota="Lo que pagaste de tu bolsa en anuncios, por canal" />
          <FormInversion key={mes} mes={mes} inicial={canalesForm} />
        </Tarjeta>
      ) : null}
    </>
  );
}
