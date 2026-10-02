import { FilaBarra, Leyenda, Tarjeta, TituloTarjeta } from "@/components/ui";
import { decimal } from "@/lib/dominio/formato";

export type FilaRankingVista = { id: string; nombre: string; unidades: number; productos: number; meta: number; yo?: boolean };

/** Ranking del mes: unidades contra meta de cada vendedor. */
export function Ranking({ filas, titulo }: { filas: FilaRankingVista[]; titulo: string }) {
  const max = Math.max(1, ...filas.map((f) => Math.max(f.meta, f.unidades)));
  const orden = [...filas].sort((a, b) => b.unidades - a.unidades || b.productos - a.productos || a.nombre.localeCompare(b.nombre));
  return (
    <Tarjeta>
      <TituloTarjeta titulo={titulo} nota="Unidades / meta · productos por unidad" />
      <div className="grid gap-2.5">
        {orden.map((f, i) => (
          <FilaBarra key={f.id} etiqueta={<span className={f.yo ? "font-semibold" : ""}>{i + 1}. {f.nombre}</span>} valor={f.unidades} max={max} meta={f.meta}
            titulo={`${f.nombre}: ${f.unidades} de ${f.meta}`}
            texto={<>{f.unidades}<span className="font-normal text-muted"> / {f.meta}</span><span className="ml-2 text-[0.76rem] font-normal text-muted">{f.unidades ? decimal(f.productos / f.unidades) : "0.0"} p/u</span></>} />
        ))}
      </div>
      <Leyenda />
    </Tarjeta>
  );
}
