-- =====================================================================
-- Adendum de la oferta de octubre 2026 (OC-2610-1) y campaña de anuncios.
--   · Dolphin Mini 300 km vuelve a tener bono flexible de $25,000.
--   · Cada modelo guarda las cifras oficiales de la campaña del mes
--     (mensualidad desde, tasa desde, enganche desde) y su autonomía,
--     para que el generador de anuncios use exactamente lo que publica
--     la agencia. Se editan en Catálogo y precios.
--   · Galería de anuncios oficiales del mes (las piezas que manda
--     mercadotecnia), para descargarlos y compartirlos.
-- =====================================================================

update public.modelos set bono = 25000
 where clave = 'dolphin-mini-300' and agencia_id = '0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01';

alter table public.modelos add column autonomia text check (autonomia is null or length(autonomia) <= 28);
-- {"mensualidad": 6141, "tasa": 0.0788, "enganche": 0.10}
alter table public.modelos add column campana jsonb not null default '{}'::jsonb;

update public.modelos m set autonomia = o.autonomia, campana = o.campana
from (values
  ('king-gl',      'COMB. 1,680 KM*', '{"mensualidad": 6307, "tasa": 0.0788, "enganche": 0.10}'::jsonb),
  ('king-gs',      'COMB. 1,680 KM*', '{"tasa": 0.0788}'::jsonb),
  ('song-plus',    'COMB. 1,105 KM*', '{"mensualidad": 6141, "tasa": 0.0788}'::jsonb),
  ('yuan-pro-dmi', 'COMB. 1,045 KM*', '{"mensualidad": 7945, "tasa": 0.0788}'::jsonb),
  ('song-pro',     'COMB. 1,001 KM*', '{"mensualidad": 8645, "tasa": 0.0788}'::jsonb),
  ('shark-gl',     'COMB. 840 KM*',   '{"mensualidad": 14731, "tasa": 0.0788}'::jsonb),
  ('shark-gs',     'COMB. 840 KM*',   '{"tasa": 0.0788}'::jsonb),
  ('m9',           'COMB. 945 KM*',   '{"tasa": 0.0788, "enganche": 0.10}'::jsonb)
) as o (clave, autonomia, campana)
where m.clave = o.clave and m.agencia_id = '0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01';

-- ---------------------------------------------------------------------
-- Anuncios oficiales del mes. Dirección los sube; todo el equipo los ve.
-- ---------------------------------------------------------------------
create table public.anuncios_oficiales (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid not null default public.mi_agencia() references public.agencias (id) on delete cascade,
  mes date not null check (extract(day from mes) = 1),
  modelo_id uuid references public.modelos (id) on delete set null,
  titulo text not null check (length(trim(titulo)) between 1 and 80),
  mime text not null default 'image/jpeg' check (mime in ('image/jpeg', 'image/png', 'image/webp')),
  datos text not null check (length(datos) <= 6000000),
  miniatura text not null check (length(miniatura) <= 400000),
  orden int not null default 0,
  created_at timestamptz not null default now()
);
create index anuncios_oficiales_mes_idx on public.anuncios_oficiales (agencia_id, mes);

alter table public.anuncios_oficiales enable row level security;
revoke all on public.anuncios_oficiales from anon;
grant select, insert, update, delete on public.anuncios_oficiales to authenticated, service_role;

create policy anuncios_oficiales_leer on public.anuncios_oficiales for select to authenticated
  using (agencia_id = public.mi_agencia());
create policy anuncios_oficiales_escribir on public.anuncios_oficiales for all to authenticated
  using (agencia_id = public.mi_agencia() and public.es_direccion())
  with check (agencia_id = public.mi_agencia() and public.es_direccion());
