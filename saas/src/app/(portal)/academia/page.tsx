import Link from "next/link";
import { Check, Star } from "lucide-react";
import { requerirSesion } from "@/lib/sesion";
import { EXAMEN, MINUTOS_TOTALES, MODULOS, moduloAprobado } from "@/lib/academia";
import { Encabezado, Pastilla, Progreso, Tarjeta, TituloTarjeta, cx } from "@/components/ui";

export const metadata = { title: "Academia BYD" };

export default async function Academia() {
  const s = await requerirSesion();
  const { data } = await s.sb.from("academia_progreso").select("respuestas, examen, examen_terminado").eq("usuario_id", s.perfil.id).maybeSingle();
  const resp = (data?.respuestas ?? {}) as Record<string, number>;
  const examen = (data?.examen ?? {}) as Record<string, number>;
  const estados = MODULOS.map((m) => moduloAprobado(m, resp));
  const hechos = estados.filter((e) => e.aprobado).length;
  const calif = data?.examen_terminado ? Math.round((EXAMEN.filter((q) => examen[q.id] === q.answer).length / EXAMEN.length) * 100) : null;
  return (
    <>
      <Encabezado eyebrow="Equipo" titulo="Academia BYD" descripcion={`De 0 a 100 en unas ${Math.round(MINUTOS_TOTALES / 60)} horas: marca, tecnología, catálogo, King, Banorte, proceso, objeciones y examen final. Apruebas cada módulo con 80% del quiz.`} />
      <Tarjeta>
        <TituloTarjeta titulo="Tu avance"><Pastilla tono={hechos === MODULOS.length ? "ok" : "acc"}>{hechos} de {MODULOS.length} módulos</Pastilla></TituloTarjeta>
        <Progreso valor={hechos / MODULOS.length} className="h-2.5" />
      </Tarjeta>
      <ol className="grid gap-2.5">
        {MODULOS.map((m, i) => {
          const e = estados[i];
          return (
            <li key={m.id}>
              <Link href={`/academia/${m.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-card transition hover:border-accent">
                <span className={cx("grid size-9 shrink-0 place-items-center rounded-full font-display text-lg font-semibold", e.aprobado ? "bg-ok text-surface" : "bg-surface-2")}>{e.aprobado ? <Check className="size-4" strokeWidth={3} /> : m.n}</span>
                <span className="min-w-0 flex-1"><strong className="block">{m.title}</strong><span className="block truncate text-[0.82rem] text-muted">{m.minutes} min · {m.goal}</span></span>
                <Pastilla tono={e.aprobado ? "ok" : e.contestadas ? "warn" : "neutro"}>{e.contestadas ? `${e.bien}/${e.total}` : "Pendiente"}</Pastilla>
              </Link>
            </li>
          );
        })}
        <li>
          <Link href="/academia/examen" className="flex items-center gap-4 rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-card transition hover:border-accent">
            <span className={cx("grid size-9 shrink-0 place-items-center rounded-full", calif != null ? "bg-ok text-surface" : "bg-surface-2")}><Star className="size-4" /></span>
            <span className="min-w-0 flex-1"><strong className="block">Examen final</strong><span className="block text-[0.82rem] text-muted">{EXAMEN.length} preguntas de todo el programa</span></span>
            <Pastilla tono={calif == null ? "neutro" : calif >= 80 ? "ok" : "warn"}>{calif == null ? "Pendiente" : `${calif}%`}</Pastilla>
          </Link>
        </li>
      </ol>
    </>
  );
}
