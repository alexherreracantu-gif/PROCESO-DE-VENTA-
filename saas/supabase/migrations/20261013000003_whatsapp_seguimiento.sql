-- Seguimiento automático por WhatsApp de los prospectos de la landing de flotillas.
--  · whatsapp_mensajes: cada plantilla automática que salió (bienvenida y días 1, 3, 7 y 14) y su
--    estado de entrega. Uno por prospecto y paso: nunca se manda dos veces el mismo.
--  · whatsapp_entrantes: que alguien contestó (para detener la secuencia). No guarda el texto.
--  · whatsapp_bajas: teléfonos que pidieron BAJA; no se les vuelve a mandar nada automático.
-- Solo el servidor escribe (cron y webhook de Meta). Teléfonos a 10 dígitos, como en prospectos.
create table if not exists public.whatsapp_mensajes (
  id bigint generated always as identity primary key,
  agencia_id uuid not null references public.agencias (id) on delete cascade,
  prospecto_id uuid not null references public.prospectos (id) on delete cascade,
  paso text not null check (paso in ('bienvenida', 'dia1', 'dia3', 'dia7', 'dia14')),
  plantilla text not null,
  estado text not null default 'enviando' check (estado in ('enviando', 'enviado', 'entregado', 'leido', 'fallido')),
  error text,
  wa_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (prospecto_id, paso)
);
create index if not exists whatsapp_mensajes_agencia_idx on public.whatsapp_mensajes (agencia_id, created_at);
drop trigger if exists whatsapp_mensajes_tocar on public.whatsapp_mensajes;
create trigger whatsapp_mensajes_tocar before update on public.whatsapp_mensajes for each row execute function public.tocar_updated_at();

create table if not exists public.whatsapp_entrantes (
  id bigint generated always as identity primary key,
  agencia_id uuid not null references public.agencias (id) on delete cascade,
  wa_id text not null unique,
  telefono text not null check (telefono ~ '^\d{10}$'),
  prospecto_id uuid references public.prospectos (id) on delete set null,
  baja boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_entrantes_telefono_idx on public.whatsapp_entrantes (agencia_id, telefono, created_at);

create table if not exists public.whatsapp_bajas (
  agencia_id uuid not null references public.agencias (id) on delete cascade,
  telefono text not null check (telefono ~ '^\d{10}$'),
  created_at timestamptz not null default now(),
  primary key (agencia_id, telefono)
);

alter table public.whatsapp_mensajes enable row level security;
alter table public.whatsapp_entrantes enable row level security;
alter table public.whatsapp_bajas enable row level security;
revoke all on public.whatsapp_mensajes, public.whatsapp_entrantes, public.whatsapp_bajas from anon, authenticated;
grant select on public.whatsapp_mensajes, public.whatsapp_entrantes, public.whatsapp_bajas to authenticated;
grant select, insert, update, delete on public.whatsapp_mensajes, public.whatsapp_entrantes, public.whatsapp_bajas to service_role;

-- El asesor ve lo de sus prospectos; dirección, todo. Las bajas, solo dirección.
drop policy if exists whatsapp_mensajes_leer on public.whatsapp_mensajes;
create policy whatsapp_mensajes_leer on public.whatsapp_mensajes for select to authenticated
  using (agencia_id = public.mi_agencia() and (
    public.es_direccion()
    or exists (select 1 from public.prospectos p where p.id = prospecto_id and p.asesor_id = auth.uid())
  ));
drop policy if exists whatsapp_entrantes_leer on public.whatsapp_entrantes;
create policy whatsapp_entrantes_leer on public.whatsapp_entrantes for select to authenticated
  using (agencia_id = public.mi_agencia() and (
    public.es_direccion()
    or exists (select 1 from public.prospectos p where p.id = prospecto_id and p.asesor_id = auth.uid())
  ));
drop policy if exists whatsapp_bajas_leer on public.whatsapp_bajas;
create policy whatsapp_bajas_leer on public.whatsapp_bajas for select to authenticated
  using (agencia_id = public.mi_agencia() and public.es_direccion());
