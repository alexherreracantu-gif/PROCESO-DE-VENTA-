-- =====================================================================
-- Fotos de cada modelo para mandar al cliente: 4 por modelo
-- (posiciones 1 a 3 exterior, 4 interior). Dirección las sube; todo el
-- equipo las ve y las descarga. Se guardan comprimidas (≈ 300 KB c/u).
-- =====================================================================

create table public.modelo_fotos (
  modelo_id uuid not null references public.modelos (id) on delete cascade,
  posicion smallint not null check (posicion between 1 and 4),
  agencia_id uuid not null default public.mi_agencia() references public.agencias (id) on delete cascade,
  mime text not null default 'image/jpeg' check (mime in ('image/jpeg', 'image/png', 'image/webp')),
  -- Imagen en base64: completa (máx. 1600 px) y miniatura (máx. 480 px) para la galería.
  datos text not null check (length(datos) <= 4000000),
  miniatura text not null check (length(miniatura) <= 400000),
  ancho int,
  alto int,
  updated_at timestamptz not null default now(),
  primary key (modelo_id, posicion)
);

create trigger modelo_fotos_tocar before update on public.modelo_fotos
  for each row execute function public.tocar_updated_at();

alter table public.modelo_fotos enable row level security;
revoke all on public.modelo_fotos from anon;
grant select, insert, update, delete on public.modelo_fotos to authenticated, service_role;

create policy modelo_fotos_leer on public.modelo_fotos for select to authenticated
  using (agencia_id = public.mi_agencia());
create policy modelo_fotos_escribir on public.modelo_fotos for all to authenticated
  using (agencia_id = public.mi_agencia() and public.es_direccion())
  with check (agencia_id = public.mi_agencia() and public.es_direccion());
