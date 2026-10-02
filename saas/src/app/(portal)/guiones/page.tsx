import { requerirSesion } from "@/lib/sesion";
import { GUIONES } from "@/lib/dominio/catalogos";
import { BotonCopiar } from "@/components/cliente";
import { Encabezado, Tarjeta } from "@/components/ui";

export const metadata = { title: "Guiones" };

export default async function Guiones() {
  const { perfil } = await requerirSesion();
  const nombre = perfil.rol === "ceo" ? "tu asesor" : perfil.nombre_corto;
  return (
    <>
      <Encabezado eyebrow="Vender" titulo="Guiones" descripcion="Listos para copiar. Tono humano; cada uno cierra a cita, prueba o preaprobación." />
      <div className="grid gap-4 md:grid-cols-2">
        {GUIONES.map((g) => {
          const texto = g.b.replace(/\{n\}/g, nombre);
          return (
            <Tarjeta key={g.t} className="grid content-start gap-3">
              <p className="eyebrow">{g.t}</p>
              <p className="leading-relaxed">{texto}</p>
              <div><BotonCopiar texto={texto} /></div>
            </Tarjeta>
          );
        })}
      </div>
    </>
  );
}
