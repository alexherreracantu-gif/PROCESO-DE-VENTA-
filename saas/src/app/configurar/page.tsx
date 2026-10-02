import { redirect } from "next/navigation";
import { configurado } from "@/lib/config";

export const metadata = { title: "Configurar" };

export default function Configurar() {
  if (configurado) redirect("/login");
  return (
    <main className="mx-auto grid min-h-dvh max-w-[640px] content-center gap-5 px-4 py-10">
      <p className="font-display text-4xl font-bold tracking-wide">PARK POINT</p>
      <h1 className="text-xl font-semibold">Falta conectar la base de datos</h1>
      <p className="text-muted">Agrega estas variables en Vercel (Settings → Environment Variables) o en <code>.env.local</code> y vuelve a desplegar:</p>
      <pre className="overflow-x-auto rounded-xl bg-surface-2 p-4 font-mono text-[0.82rem]">{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...`}</pre>
      <p className="text-sm text-muted">Los pasos completos están en el README del proyecto, sección “Puesta en marcha”.</p>
    </main>
  );
}
