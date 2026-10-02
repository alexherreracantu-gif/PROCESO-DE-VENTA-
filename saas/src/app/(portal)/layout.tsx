import { requerirSesion } from "@/lib/sesion";
import { ROLES } from "@/lib/dominio/catalogos";
import { iniciales } from "@/lib/dominio/formato";
import { Marco } from "@/components/marco";

export default async function LayoutPortal({ children }: LayoutProps<"/">) {
  const { perfil, agencia, direccion } = await requerirSesion();
  const ceo = perfil.rol === "ceo";
  return (
    <Marco
      usuario={{ nombre: ceo ? "CEO" : perfil.nombre, corto: perfil.nombre_corto, rol: ROLES[perfil.rol], iniciales: ceo ? "CEO" : iniciales(perfil.nombre), destacado: perfil.rol !== "asesor" }}
      agencia={agencia.nombre}
      direccion={direccion}
    >
      {children}
    </Marco>
  );
}
