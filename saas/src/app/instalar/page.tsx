import { redirect } from "next/navigation";
import { configurado } from "@/lib/config";
import { Insignia } from "@/components/marca";
import { ROLES, type Rol } from "@/lib/dominio/catalogos";
import equipoInicial from "@/lib/equipo-inicial.json";
import { instalacionAbierta } from "./acciones";
import { FormInstalar } from "./formulario";

export const metadata = { title: "Configurar el portal" };
export const dynamic = "force-dynamic";

export default async function Instalar() {
  if (!configurado) redirect("/configurar");
  let abierta: boolean;
  try { abierta = await instalacionAbierta(); } catch (e) {
    return <Mensaje titulo="La base de datos todavía no está lista" texto={e instanceof Error ? e.message : ""} />;
  }
  if (!abierta) redirect("/login");
  return (
    <main className="mx-auto grid min-h-dvh max-w-[680px] content-center gap-6 px-4 py-10">
      <div className="flex items-center gap-3"><Insignia tamano={44} /><div><p className="font-display text-[1.9rem] font-bold leading-none tracking-[0.04em]">PARK POINT</p><p className="text-[0.82rem] text-muted">Primera configuración</p></div></div>
      <div>
        <h1 className="font-display text-[2.4rem] font-semibold leading-none">Configura el portal</h1>
        <p className="mt-2 text-muted">Crea tu acceso de CEO y da de alta al equipo. Esta pantalla desaparece en cuanto termines.</p>
      </div>
      <FormInstalar pideCodigo={Boolean(process.env.CODIGO_INSTALACION)}
        equipo={equipoInicial.usuarios.filter((u) => u.rol !== "ceo").map((u) => ({ usuario: u.usuario, nombre: u.nombre, rol: ROLES[u.rol as Rol] }))} />
    </main>
  );
}

function Mensaje({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <main className="mx-auto grid min-h-dvh max-w-[640px] content-center gap-3 px-4">
      <h1 className="text-xl font-semibold">{titulo}</h1>
      <p className="text-muted">Revisa que la integración de Supabase esté conectada en Vercel y vuelve a desplegar: las tablas se crean solas en cada despliegue.</p>
      {texto ? <pre className="overflow-x-auto rounded-xl bg-surface-2 p-3 font-mono text-[0.8rem]">{texto}</pre> : null}
    </main>
  );
}
