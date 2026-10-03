/** Mientras llega la pantalla: esqueleto con brillo que recorre las tarjetas. */
export default function Cargando() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Cargando">
      <div className="grid gap-2"><div className="brillo h-3 w-40 rounded" /><div className="brillo h-9 w-72 max-w-full rounded-lg" /></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="brillo h-[112px] rounded-2xl" />)}</div>
      <div className="brillo h-64 rounded-2xl" />
    </div>
  );
}
