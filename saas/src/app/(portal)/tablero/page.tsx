import { requerirSesion } from "@/lib/sesion";
import { VistaTablero, filtrosTablero } from "@/components/tablero/vista";

export const metadata = { title: "Tablero de reporte" };

export default async function Tablero(props: PageProps<"/tablero">) {
  const s = await requerirSesion();
  const { mes, vendedor } = filtrosTablero(s, await props.searchParams);
  return <VistaTablero s={s} mes={mes} vendedor={vendedor} base="/tablero" />;
}
