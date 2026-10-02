import { BotonEnlace } from "@/components/ui";

export default function NoEncontrado() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="grid justify-items-center gap-3 text-center">
        <p className="font-display text-6xl font-bold">404</p>
        <h1 className="text-lg font-semibold">No encontramos esa página</h1>
        <p className="text-muted">Puede que el registro se haya borrado o que el enlace esté mal.</p>
        <BotonEnlace href="/inicio">Ir al inicio</BotonEnlace>
      </div>
    </main>
  );
}
