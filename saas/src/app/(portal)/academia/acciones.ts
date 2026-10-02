"use server";

import { revalidatePath } from "next/cache";
import { requerirSesion } from "@/lib/sesion";
import { EXAMEN, MODULOS } from "@/lib/academia";
import type { Resultado } from "@/lib/tipos";

const PREGUNTAS = new Map([...MODULOS.flatMap((m) => m.quiz), ...EXAMEN].map((q) => [q.id, q.options.length]));

async function progreso() {
  const s = await requerirSesion();
  const { data } = await s.sb.from("academia_progreso").select("respuestas, examen, examen_terminado").eq("usuario_id", s.perfil.id).maybeSingle();
  return { s, actual: (data ?? { respuestas: {}, examen: {}, examen_terminado: false }) as { respuestas: Record<string, number>; examen: Record<string, number>; examen_terminado: boolean } };
}
async function guardar(s: Awaited<ReturnType<typeof progreso>>["s"], datos: { respuestas: Record<string, number>; examen: Record<string, number>; examen_terminado: boolean }): Promise<Resultado> {
  const { error } = await s.sb.from("academia_progreso").upsert({ usuario_id: s.perfil.id, agencia_id: s.agencia.id, ...datos }, { onConflict: "usuario_id" });
  if (error) return { ok: false, error: "No se pudo guardar tu respuesta: " + error.message };
  revalidatePath("/academia", "layout");
  return { ok: true };
}

export async function responder(tipo: "quiz" | "examen", pregunta: string, opcion: number): Promise<Resultado> {
  const n = PREGUNTAS.get(pregunta);
  if (n == null || !Number.isInteger(opcion) || opcion < 0 || opcion >= n) return { ok: false, error: "Respuesta inválida." };
  const { s, actual } = await progreso();
  if (tipo === "examen" && actual.examen_terminado) return { ok: false, error: "El examen ya está terminado. Repítelo para volver a contestar." };
  const datos = { ...actual, respuestas: { ...actual.respuestas }, examen: { ...actual.examen } };
  if (tipo === "quiz") datos.respuestas[pregunta] = opcion; else datos.examen[pregunta] = opcion;
  return guardar(s, datos);
}

export async function terminarExamen(): Promise<Resultado> {
  const { s, actual } = await progreso();
  const faltan = EXAMEN.filter((q) => actual.examen[q.id] === undefined).length;
  if (faltan) return { ok: false, error: `Te faltan ${faltan} preguntas.` };
  return guardar(s, { ...actual, examen_terminado: true });
}

export async function repetirExamen(): Promise<Resultado> {
  const { s, actual } = await progreso();
  return guardar(s, { ...actual, examen: {}, examen_terminado: false });
}

export async function repetirModulo(modulo: string): Promise<Resultado> {
  const m = MODULOS.find((x) => x.id === modulo);
  if (!m) return { ok: false, error: "Módulo desconocido." };
  const { s, actual } = await progreso();
  const respuestas = { ...actual.respuestas };
  m.quiz.forEach((q) => delete respuestas[q.id]);
  return guardar(s, { ...actual, respuestas });
}
