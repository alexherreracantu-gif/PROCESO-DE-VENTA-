import { cortesDelDia, equipo } from "@/lib/datos";
import { requerirSesion } from "@/lib/sesion";
import { CORTE } from "@/lib/dominio/catalogos";
import { fechaLarga, hoy } from "@/lib/dominio/fechas";
import { Encabezado, Pastilla, Tabla, Tarjeta, TituloTarjeta } from "@/components/ui";
import { Contador } from "./contador";
import { SelectorFecha } from "./selector-fecha";

export const metadata = { title: "Corte de piso" };

export default async function Piso(props: PageProps<"/piso">) {
  const s = await requerirSesion();
  const sp = await props.searchParams;
  const fecha = typeof sp.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : hoy();
  const [cortes, eq] = await Promise.all([cortesDelDia(s, fecha), s.direccion ? equipo(s) : Promise.resolve([])]);
  const mio = cortes.find((c) => c.usuario_id === s.perfil.id);
  const vendedores = eq.filter((p) => p.vende && p.activo);
  const porUsuario = new Map(cortes.map((c) => [c.usuario_id, c]));

  return (
    <>
      <Encabezado eyebrow="Corte de piso" titulo="Park Point" descripcion={`${fechaLarga(fecha)}. Lleva la cuenta del día con + y −. Cortes de 11:00 a 20:00 y cierre a las 20:30.`}>
        <SelectorFecha fecha={fecha} />
      </Encabezado>
      {s.perfil.vende ? <Contador key={fecha} fecha={fecha} nombre={s.perfil.nombre} inicial={mio?.valores ?? {}} /> : null}
      {s.direccion ? (
        <Tarjeta>
          <TituloTarjeta titulo="Corte del equipo" nota={fechaLarga(fecha)} />
          <Tabla>
            <thead><tr><th>Concepto</th>{vendedores.map((v) => <th key={v.id} className="!text-right">{v.nombre_corto}</th>)}<th className="!text-right">Total</th></tr></thead>
            <tbody>
              {CORTE.map((c) => {
                let total = 0;
                return (
                  <tr key={c.id}>
                    <td>{c.label}</td>
                    {vendedores.map((v) => { const n = porUsuario.get(v.id)?.valores[c.id] ?? 0; total += n; return <td key={v.id} className="text-right">{n}</td>; })}
                    <td className="text-right font-semibold">{total}</td>
                  </tr>
                );
              })}
              <tr>
                <td className="text-muted">Última actualización</td>
                {vendedores.map((v) => {
                  const c = porUsuario.get(v.id);
                  return <td key={v.id} className="text-right">{c ? <Pastilla tono="ok">{new Date(c.updated_at).toLocaleTimeString("es-MX", { timeZone: "America/Monterrey", hour: "2-digit", minute: "2-digit" })}</Pastilla> : <Pastilla tono="warn">Sin corte</Pastilla>}</td>;
                })}
                <td />
              </tr>
            </tbody>
          </Tabla>
        </Tarjeta>
      ) : null}
    </>
  );
}
