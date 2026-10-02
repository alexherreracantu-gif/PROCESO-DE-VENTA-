import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { obtenerSesion } from "@/lib/sesion";
import { catalogo, metaUnidades, metasDelMes, seguimientosPendientes, ventasDelMes } from "@/lib/datos";
import { ROLES } from "@/lib/dominio/catalogos";
import { hoy, mesActual, nombreMes } from "@/lib/dominio/fechas";
import { dinero } from "@/lib/dominio/formato";

export const maxDuration = 60;

const Entrada = z.object({
  mensajes: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) })).min(1).max(20),
});

/** Arma el contexto del negocio y del usuario para el agente. */
async function sistema(s: NonNullable<Awaited<ReturnType<typeof obtenerSesion>>>) {
  const mes = mesActual();
  const [cat, metas, ventas, pendientes] = await Promise.all([
    catalogo(s), metasDelMes(s, mes),
    s.perfil.vende ? ventasDelMes(s, mes, s.perfil.id) : Promise.resolve([]),
    s.perfil.vende ? seguimientosPendientes(s, hoy(), s.perfil.id) : Promise.resolve([]),
  ]);
  const pa = s.agencia.parametros;
  const vivas = ventas.filter((v) => v.estatus !== "cancelada");
  const lineas = [
    `Eres el agente de ventas del portal Park Point de ${s.agencia.nombre} (${s.agencia.grupo ?? s.agencia.marca}, Monterrey). Hablas con ${s.perfil.nombre}, ${ROLES[s.perfil.rol]}.`,
    "Estilo: humano, breve y directo, en español mexicano. Si te piden un WhatsApp, entrega el mensaje listo para copiar, corto, con máximo un emoji.",
    "Reglas: no inventes precios, tasas ni promociones; usa solo los datos de abajo y avisa que se validan con la campaña del mes. Nunca prometas autorización de crédito. Recomienda 1 modelo (máximo 2) y siempre propone prueba de manejo. El bono flexible solo aplica financiando desde 5% de enganche. Enganche no es lo mismo que pago a la firma (comisión × 1.16, placas y seguros). Seguimiento con una razón concreta, nunca \"¿sigues interesado?\". Cierre: preaprobación o visita; separación de $5,000 al concepto Accesorios.",
    "Convenios Banorte por % de enganche: menos de 20% 14.99% (comisión 2.5%); 20% 13.88%; 25% 11.88%; 40% 10.88%; 50% 7.88%; King GL 2027 con 50% 7.18%; eléctricos con 50% 7.18% (comisión 2.5%).",
    `Catálogo vigente: ${cat.modelos.map((m) => `${m.nombre} ${m.anio} ${dinero(m.precio)}${m.bono ? ` (bono ${dinero(m.bono)})` : ""}`).join("; ")}.`,
    `Productos para venta cruzada: ${cat.productos.map((p) => `${p.nombre}${p.precio ? ` ${dinero(p.precio)}` : ""}`).join("; ")}. Placas híbrido ${dinero(pa.placas_hibrido)}, eléctrico ${dinero(pa.placas_electrico)}, gestoría ${dinero(pa.gestoria)}.`,
  ];
  if (s.perfil.vende) {
    lineas.push(`Su ${nombreMes(mes)}: ${vivas.length} unidades de una meta de ${metaUnidades(s, metas, s.perfil.id)}.`);
    if (pendientes.length) lineas.push(`Seguimientos vencidos: ${pendientes.map((p) => `${p.nombre} (${p.etapa}${p.siguiente_accion ? `, pendiente: ${p.siguiente_accion}` : ""})`).join("; ")}.`);
  }
  return lineas.join("\n");
}

export async function POST(request: Request) {
  const s = await obtenerSesion();
  if (!s) return new Response("Tu sesión terminó. Vuelve a entrar.", { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) return new Response("El agente no está configurado. Falta ANTHROPIC_API_KEY.", { status: 503 });
  const datos = Entrada.safeParse(await request.json().catch(() => null));
  if (!datos.success) return new Response("Mensaje inválido.", { status: 400 });
  const mensajes = datos.data.mensajes;
  if (mensajes[0].role !== "user" || mensajes[mensajes.length - 1].role !== "user") return new Response("Mensaje inválido.", { status: 400 });

  const client = new Anthropic();
  const flujo = client.beta.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system: await sistema(s),
    messages: mensajes,
  });

  const codificar = new TextEncoder();
  const cuerpo = new ReadableStream<Uint8Array>({
    async start(control) {
      try {
        for await (const ev of flujo) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") control.enqueue(codificar.encode(ev.delta.text));
        }
        const final = await flujo.finalMessage();
        if (final.stop_reason === "refusal") control.enqueue(codificar.encode("\n\nNo puedo ayudar con eso. Reformula la pregunta enfocada a la venta."));
      } catch (e) {
        const msg = e instanceof Anthropic.RateLimitError ? "Demasiadas preguntas seguidas. Espera un momento." : e instanceof Anthropic.APIError ? "El agente no está disponible en este momento." : "Se cortó la respuesta.";
        control.enqueue(codificar.encode(`\n\n${msg}`));
      } finally {
        control.close();
      }
    },
    cancel() { flujo.abort(); },
  });
  return new Response(cuerpo, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
