import { proveedorAgente } from "@/lib/config";
import { requerirSesion } from "@/lib/sesion";
import { Aviso, Encabezado } from "@/components/ui";
import { Chat } from "./chat";

export const metadata = { title: "Agente IA" };

export default async function Agente() {
  await requerirSesion();
  const activo = Boolean(proveedorAgente());
  return (
    <>
      <Encabezado eyebrow="Vender" titulo="Agente IA" descripcion="Pídele mensajes de WhatsApp, respuestas a objeciones, qué modelo ofrecer o la siguiente acción de un prospecto. Conoce el catálogo del mes, tus metas y tus seguimientos." />
      {activo ? <Chat /> : <Aviso tono="warn">El agente está apagado. Para activarlo, agrega en Vercel la variable ANTHROPIC_API_KEY (Claude) u OPENAI_API_KEY (ChatGPT) y vuelve a desplegar.</Aviso>}
    </>
  );
}
