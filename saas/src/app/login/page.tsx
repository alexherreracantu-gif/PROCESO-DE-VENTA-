import { redirect } from "next/navigation";
import { configurado } from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { iniciales } from "@/lib/dominio/formato";
import { ROLES, type Rol } from "@/lib/dominio/catalogos";
import { SelectorAcceso, type UsuarioDirectorio } from "./selector";
import { Insignia, Logo } from "@/components/marca";

export const metadata = { title: "Iniciar sesión" };

const MOTIVOS: Record<string, string> = {
  sesion: "Tu sesión terminó. Vuelve a entrar.",
  baja: "Tu usuario está dado de baja. Habla con dirección.",
};

async function directorio(): Promise<{ usuarios: UsuarioDirectorio[]; agencia: string } | { error: string }> {
  try {
    const admin = supabaseAdmin();
    const { data, error } = await admin.from("perfiles").select("usuario, nombre, nombre_corto, rol, vende, agencias!perfiles_agencia_id_fkey(nombre)").eq("activo", true);
    if (error) return { error: "No se pudo leer el equipo. Revisa que la base de datos esté configurada (npm run setup)." };
    const orden: Record<Rol, number> = { ceo: 0, gerente: 1, asesor: 2 };
    const filas = (data ?? []) as unknown as { usuario: string; nombre: string; nombre_corto: string; rol: Rol; vende: boolean; agencias: { nombre: string } | null }[];
    filas.sort((a, b) => orden[a.rol] - orden[b.rol] || a.nombre.localeCompare(b.nombre));
    return {
      agencia: filas[0]?.agencias?.nombre ?? "",
      usuarios: filas.map((f) => ({
        usuario: f.usuario,
        nombre: f.rol === "ceo" ? f.nombre_corto : f.nombre,
        rol: ROLES[f.rol] + (f.rol === "gerente" && f.vende ? " · también vende" : ""),
        iniciales: f.rol === "ceo" ? "CEO" : iniciales(f.nombre),
        destacado: f.rol !== "asesor",
      })),
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo conectar con la base de datos." };
  }
}

export default async function Login(props: PageProps<"/login">) {
  if (!configurado) redirect("/configurar");
  const { motivo } = await props.searchParams;
  const dir = await directorio();
  return (
    <main className="relative grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <aside className="relative hidden overflow-hidden bg-brand p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full border-[56px] border-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-56 -left-24 size-[560px] rounded-full bg-brand-deep/40" />
        <div className="relative">
          <Logo ancho={260} prioridad />
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-white/80">Portal Park Point · {"agencia" in dir && dir.agencia ? dir.agencia.replace(" · Park Point", "") : "BYD Cumbres"}</p>
        </div>
        <div className="relative grid gap-6">
          <p className="max-w-[20ch] font-display text-[3.6rem] font-semibold leading-[0.95]">Cada venta, cada meta, en un solo lugar.</p>
          <ul className="grid gap-2 text-[0.95rem] text-white/85">
            <li>Ventas con VIN, cliente y productos</li>
            <li>Tablero del mes listo para WhatsApp</li>
            <li>Objetivos, CRM y corte de piso por asesor</li>
          </ul>
        </div>
        <p className="relative text-xs text-white/70">Uso interno del equipo.</p>
      </aside>
      <section className="grid content-center px-4 py-10 sm:px-10">
        <div className="mx-auto grid w-full max-w-[560px] gap-7">
          <div className="flex items-center gap-3 lg:hidden"><Insignia tamano={44} /><div><p className="font-display text-[1.9rem] font-bold leading-none tracking-[0.04em]">PARK POINT</p><p className="text-[0.78rem] text-muted">BYD Grupo TEC · Cumbres</p></div></div>
          {typeof motivo === "string" && MOTIVOS[motivo] ? <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm">{MOTIVOS[motivo]}</p> : null}
          {"error" in dir ? (
            <div className="rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">{dir.error}</div>
          ) : (
            <SelectorAcceso usuarios={dir.usuarios} />
          )}
        </div>
      </section>
    </main>
  );
}
