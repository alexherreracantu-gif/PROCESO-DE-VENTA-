import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Lo que comparten los avisos automáticos (Vercel Cron, ver vercel.json):
 *  · CRON_SECRET: Vercel lo manda solo en "Authorization: Bearer …".
 *  · RESEND_API_KEY: cuenta gratis en resend.com.
 *  · RESUMEN_REMITENTE (opcional): "Park Point <avisos@tudominio.com>". Sin dominio propio,
 *    Resend solo deja mandar al correo con el que se abrió la cuenta.
 */
export function cronAutorizado(request: Request) {
  const esperado = process.env.CRON_SECRET;
  if (!esperado) return false;
  const a = Buffer.from(request.headers.get("authorization") ?? ""), b = Buffer.from(`Bearer ${esperado}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function urlPortal(request: Request) {
  return process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : new URL(request.url).origin;
}

export async function enviarCorreo(llave: string, c: { para: string; asunto: string; html: string; texto: string }) {
  const r = await fetch(`${process.env.RESEND_API_URL ?? "https://api.resend.com"}/emails`, {
    method: "POST",
    headers: { Authorization: `Bearer ${llave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.RESUMEN_REMITENTE || "Park Point <onboarding@resend.dev>", to: [c.para], subject: c.asunto, html: c.html, text: c.texto }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  return !!r?.ok;
}
