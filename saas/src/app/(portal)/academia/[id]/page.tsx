import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requerirSesion } from "@/lib/sesion";
import { EXAMEN, MODULOS } from "@/lib/academia";
import { BotonEnlace, Encabezado, Tarjeta, TituloTarjeta } from "@/components/ui";
import { Preguntas } from "../preguntas";

export const metadata = { title: "Academia BYD" };

export default async function Modulo(props: PageProps<"/academia/[id]">) {
  const { id } = await props.params;
  const s = await requerirSesion();
  const { data } = await s.sb.from("academia_progreso").select("respuestas, examen, examen_terminado").eq("usuario_id", s.perfil.id).maybeSingle();
  const volver = <Link href="/academia" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg"><ArrowLeft className="size-4" />Academia</Link>;

  if (id === "examen") {
    const terminado = !!data?.examen_terminado;
    const examen = (data?.examen ?? {}) as Record<string, number>;
    const calif = Math.round((EXAMEN.filter((q) => examen[q.id] === q.answer).length / EXAMEN.length) * 100);
    return (
      <>
        {volver}
        <Encabezado eyebrow="Examen final" titulo="Examen BYD" descripcion={terminado ? `Calificación: ${calif}%. Revisa tus respuestas abajo.` : "Contesta todas y toca “Terminar examen” para ver tu calificación."} />
        <Tarjeta><Preguntas tipo="examen" preguntas={EXAMEN} respuestas={examen} revelar={terminado} /></Tarjeta>
      </>
    );
  }
  const i = MODULOS.findIndex((m) => m.id === id);
  if (i < 0) notFound();
  const m = MODULOS[i], sig = MODULOS[i + 1];
  return (
    <>
      {volver}
      <Encabezado eyebrow={`Módulo ${m.n} · ${m.minutes} min`} titulo={m.title} descripcion={m.goal} />
      <Tarjeta className="grid max-w-[78ch] gap-5">
        {m.blocks.map((b) => <section key={b.h} className="grid gap-1.5"><h2 className="text-[1.02rem] font-semibold">{b.h}</h2><p className="leading-relaxed">{b.p}</p></section>)}
      </Tarjeta>
      <Tarjeta>
        <TituloTarjeta titulo="Quiz" nota="Necesitas 80% para aprobar" />
        <Preguntas tipo="quiz" preguntas={m.quiz} respuestas={(data?.respuestas ?? {}) as Record<string, number>} revelar={false} modulo={m.id} />
      </Tarjeta>
      <div>{sig ? <BotonEnlace href={`/academia/${sig.id}`}>Siguiente: {sig.title}</BotonEnlace> : <BotonEnlace href="/academia/examen">Ir al examen final</BotonEnlace>}</div>
    </>
  );
}
