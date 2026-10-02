-- =====================================================================
-- Park Point · esquema base (multi-agencia)
-- Cada fila de negocio pertenece a una agencia. Los permisos se aplican
-- en la base con Row Level Security (ver 20261002000002_permisos.sql).
-- =====================================================================

create type public.rol_usuario as enum ('ceo', 'gerente', 'asesor');
create type public.estatus_venta as enum ('apartada', 'facturada', 'entregada', 'cancelada');
create type public.etapa_prospecto as enum ('nuevo', 'contactado', 'cita', 'prueba', 'cotizado', 'credito', 'apartado', 'entregado', 'referidor', 'perdido');
create type public.calor_prospecto as enum ('alta', 'media', 'fria');
create type public.tipo_motor as enum ('electrico', 'hibrido');

-- ---------------------------------------------------------------------
-- Agencias y perfiles
-- ---------------------------------------------------------------------
create table public.agencias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  marca text not null default 'BYD',
  grupo text,
  ciudad text,
  -- Montos que usa el cotizador: placas, gestoría, separación, etc.
  parametros jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  agencia_id uuid not null references public.agencias (id) on delete cascade,
  usuario text not null unique check (usuario ~ '^[a-z0-9._-]{2,32}$'),
  nombre text not null check (length(trim(nombre)) > 0),
  nombre_corto text not null check (length(trim(nombre_corto)) > 0),
  rol public.rol_usuario not null default 'asesor',
  vende boolean not null default true,
  activo boolean not null default true,
  telefono text,
  created_at timestamptz not null default now()
);
create index perfiles_agencia_idx on public.perfiles (agencia_id);

-- Funciones de sesión. SECURITY DEFINER para leer perfiles sin pasar por
-- sus propias políticas (evita recursión).
create function public.mi_agencia() returns uuid
language sql stable security definer set search_path = public as $$
  select agencia_id from public.perfiles where id = auth.uid() and activo
$$;

create function public.es_direccion() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select rol in ('ceo', 'gerente') from public.perfiles where id = auth.uid() and activo), false)
$$;

-- ---------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------
create table public.modelos (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid not null default public.mi_agencia() references public.agencias (id) on delete cascade,
  clave text not null,
  nombre text not null,
  anio int not null check (anio between 2015 and 2100),
  motor public.tipo_motor not null,
  precio numeric(12, 2) not null check (precio >= 0),
  bono numeric(12, 2) not null default 0 check (bono >= 0),
  descripcion text,
  activo boolean not null default true,
  orden int not null default 0,
  banorte_submarca text,
  banorte_anio text,
  banorte_modelo text,
  updated_at timestamptz not null default now(),
  unique (agencia_id, clave)
);

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid not null default public.mi_agencia() references public.agencias (id) on delete cascade,
  clave text not null,
  nombre text not null,
  nombre_corto text not null,
  precio numeric(12, 2) check (precio is null or precio >= 0),
  activo boolean not null default true,
  orden int not null default 0,
  unique (agencia_id, clave)
);

-- ---------------------------------------------------------------------
-- Ventas
-- ---------------------------------------------------------------------
create table public.ventas (
  id uuid primary key default gen_random_uuid(),
  folio bigint generated always as identity,
  agencia_id uuid not null default public.mi_agencia() references public.agencias (id) on delete cascade,
  fecha date not null default current_date,
  vendedor_id uuid not null references public.perfiles (id),
  cliente text not null check (length(trim(cliente)) > 0),
  num_cliente text,
  telefono text,
  vin text check (vin is null or vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  modelo_id uuid not null references public.modelos (id),
  color text not null check (length(trim(color)) > 0),
  color_nombre text,
  forma_pago text not null default 'Crédito Banorte' check (forma_pago in ('Crédito Banorte', 'Crédito otro banco', 'Contado')),
  plaza text not null default 'Monterrey' check (plaza in ('Monterrey', 'Piedras Negras')),
  estatus public.estatus_venta not null default 'facturada',
  fecha_entrega date,
  valor_factura numeric(12, 2) check (valor_factura is null or valor_factura >= 0),
  notas text,
  -- Pasos del expediente cumplidos: {"cotizacion": "2026-10-02", ...}
  expediente jsonb not null default '{}'::jsonb,
  creado_por uuid default auth.uid() references public.perfiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ventas_agencia_fecha_idx on public.ventas (agencia_id, fecha);
create index ventas_vendedor_fecha_idx on public.ventas (vendedor_id, fecha);
-- Un VIN no puede estar en dos ventas vivas de la misma agencia.
create unique index ventas_vin_unico on public.ventas (agencia_id, vin) where vin is not null and estatus <> 'cancelada';

create table public.venta_productos (
  venta_id uuid not null references public.ventas (id) on delete cascade,
  producto_id uuid not null references public.productos (id) on delete restrict,
  precio numeric(12, 2) check (precio is null or precio >= 0),
  primary key (venta_id, producto_id)
);
create index venta_productos_producto_idx on public.venta_productos (producto_id);

-- ---------------------------------------------------------------------
-- Objetivos del mes (mes = primer día del mes)
-- ---------------------------------------------------------------------
create table public.metas (
  agencia_id uuid not null default public.mi_agencia() references public.agencias (id) on delete cascade,
  mes date not null check (extract(day from mes) = 1),
  vendedor_id uuid not null references public.perfiles (id) on delete cascade,
  unidades int not null check (unidades between 0 and 999),
  primary key (agencia_id, mes, vendedor_id)
);

create table public.metas_producto (
  agencia_id uuid not null default public.mi_agencia() references public.agencias (id) on delete cascade,
  mes date not null check (extract(day from mes) = 1),
  producto_id uuid not null references public.productos (id) on delete cascade,
  porcentaje int not null check (porcentaje between 0 and 100),
  primary key (agencia_id, mes, producto_id)
);

-- ---------------------------------------------------------------------
-- CRM
-- ---------------------------------------------------------------------
create table public.prospectos (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid not null default public.mi_agencia() references public.agencias (id) on delete cascade,
  asesor_id uuid not null references public.perfiles (id),
  nombre text not null check (length(trim(nombre)) > 0),
  telefono text,
  modelo_id uuid references public.modelos (id) on delete set null,
  etapa public.etapa_prospecto not null default 'nuevo',
  origen text not null default 'Park Point',
  calor public.calor_prospecto not null default 'media',
  siguiente_accion text,
  fecha_siguiente date,
  enganche numeric(12, 2) check (enganche is null or enganche >= 0),
  toma_a_cuenta text,
  notas text,
  venta_id uuid references public.ventas (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index prospectos_asesor_idx on public.prospectos (asesor_id, etapa);
create index prospectos_agencia_idx on public.prospectos (agencia_id, fecha_siguiente);

-- ---------------------------------------------------------------------
-- Corte de piso (uno por usuario por día)
-- ---------------------------------------------------------------------
create table public.cortes (
  fecha date not null,
  usuario_id uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  agencia_id uuid not null default public.mi_agencia() references public.agencias (id) on delete cascade,
  valores jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (fecha, usuario_id)
);
create index cortes_agencia_fecha_idx on public.cortes (agencia_id, fecha);

-- ---------------------------------------------------------------------
-- Academia
-- ---------------------------------------------------------------------
create table public.academia_progreso (
  usuario_id uuid primary key default auth.uid() references public.perfiles (id) on delete cascade,
  agencia_id uuid not null default public.mi_agencia() references public.agencias (id) on delete cascade,
  respuestas jsonb not null default '{}'::jsonb,
  examen jsonb not null default '{}'::jsonb,
  examen_terminado boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Bitácora de cambios
-- ---------------------------------------------------------------------
create table public.bitacora (
  id bigint generated always as identity primary key,
  agencia_id uuid not null references public.agencias (id) on delete cascade,
  tabla text not null,
  registro_id text not null,
  accion text not null,
  usuario_id uuid,
  datos jsonb,
  created_at timestamptz not null default now()
);
create index bitacora_registro_idx on public.bitacora (tabla, registro_id, created_at desc);

-- ---------------------------------------------------------------------
-- Disparadores
-- ---------------------------------------------------------------------
create function public.tocar_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger ventas_updated before update on public.ventas for each row execute function public.tocar_updated_at();
create trigger prospectos_updated before update on public.prospectos for each row execute function public.tocar_updated_at();
create trigger cortes_updated before update on public.cortes for each row execute function public.tocar_updated_at();
create trigger modelos_updated before update on public.modelos for each row execute function public.tocar_updated_at();
create trigger academia_updated before update on public.academia_progreso for each row execute function public.tocar_updated_at();

-- Coherencia: vendedor y modelo deben ser de la misma agencia que la venta.
create function public.validar_venta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from perfiles where id = new.vendedor_id and agencia_id = new.agencia_id and vende and activo) then
    raise exception 'El vendedor no pertenece a esta agencia o no está activo' using errcode = '23514';
  end if;
  if not exists (select 1 from modelos where id = new.modelo_id and agencia_id = new.agencia_id) then
    raise exception 'El modelo no pertenece a esta agencia' using errcode = '23514';
  end if;
  new.vin := nullif(upper(trim(coalesce(new.vin, ''))), '');
  return new;
end $$;
create trigger ventas_validar before insert or update on public.ventas for each row execute function public.validar_venta();

create function public.validar_prospecto() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from perfiles where id = new.asesor_id and agencia_id = new.agencia_id and activo) then
    raise exception 'El asesor no pertenece a esta agencia o no está activo' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger prospectos_validar before insert or update on public.prospectos for each row execute function public.validar_prospecto();

create function public.registrar_bitacora() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  fila jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into bitacora (agencia_id, tabla, registro_id, accion, usuario_id, datos)
  values ((fila ->> 'agencia_id')::uuid, tg_table_name, fila ->> 'id', lower(tg_op), auth.uid(), fila);
  return null;
end $$;
create trigger ventas_bitacora after insert or update or delete on public.ventas for each row execute function public.registrar_bitacora();

-- ---------------------------------------------------------------------
-- Ranking del mes: solo números por vendedor (sin datos de clientes),
-- para que los asesores vean cómo va el equipo.
-- ---------------------------------------------------------------------
create function public.ranking_mes(p_mes date)
returns table (vendedor_id uuid, unidades int, productos int)
language sql stable security definer set search_path = public as $$
  select v.vendedor_id,
         count(*)::int as unidades,
         coalesce(sum((select count(*) from venta_productos vp where vp.venta_id = v.id)), 0)::int as productos
  from ventas v
  where v.agencia_id = mi_agencia()
    and v.estatus <> 'cancelada'
    and v.fecha >= date_trunc('month', p_mes)::date
    and v.fecha < (date_trunc('month', p_mes) + interval '1 month')::date
  group by v.vendedor_id
$$;
