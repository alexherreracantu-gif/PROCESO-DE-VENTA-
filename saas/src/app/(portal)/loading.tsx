export default function Cargando() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Cargando">
      <div className="grid gap-2"><div className="h-3 w-40 animate-pulse rounded bg-surface-2" /><div className="h-9 w-72 animate-pulse rounded-lg bg-surface-2" /></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[112px] animate-pulse rounded-2xl bg-surface-2" />)}</div>
      <div className="h-64 animate-pulse rounded-2xl bg-surface-2" />
    </div>
  );
}
