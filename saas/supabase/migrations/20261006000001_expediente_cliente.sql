-- =====================================================================
-- Expediente completo por cliente: de la aprobación del crédito a la
-- hoja de salida.
--   · venta_movimientos: cuenta del cliente (cargos y pagos, como la
--     "aplicación de pago" de caja), para cuadrar al peso.
--   · venta_documentos: archivos del expediente (en Supabase Storage,
--     bucket privado "expedientes") o enlaces de Google Drive.
--   · ventas.credito: datos de la carta de aprobación.
-- Los permisos siguen a la venta: quien ve la venta ve su expediente.
-- =====================================================================

alter table public.ventas add column credito jsonb not null default '{}'::jsonb;

create table public.venta_movimientos (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas (id) on delete cascade,
  agencia_id uuid not null default public.mi_agencia() references public.agencias (id) on delete cascade,
  -- cargo = lo que el cliente debe (factura, accesorios, placas…); pago = con qué se cubre.
  tipo text not null check (tipo in ('cargo', 'pago')),
  -- Cargo: accesorios, placas, gestoria…  Pago: separacion, cliente, desembolso, bono…
  concepto text not null check (concepto ~ '^[a-z_]{2,30}$'),
  -- Pago: a qué concepto lo aplicó caja (factura, accesorios…).
  aplica_a text check (aplica_a is null or aplica_a ~ '^[a-z_]{2,30}$'),
  monto numeric(12, 2) not null check (monto > 0 and monto <= 50000000),
  fecha date not null default current_date,
  forma text check (forma is null or length(forma) <= 40),
  referencia text check (referencia is null or length(referencia) <= 80),
  notas text check (notas is null or length(notas) <= 300),
  creado_por uuid default auth.uid() references public.perfiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index venta_movimientos_venta_idx on public.venta_movimientos (venta_id, fecha);

create table public.venta_documentos (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas (id) on delete cascade,
  agencia_id uuid not null default public.mi_agencia() references public.agencias (id) on delete cascade,
  -- Requisito del expediente (ine, aprobacion, factura, salida…) o "recibo" de un pago.
  tipo text not null check (tipo ~ '^[a-z_]{2,30}$'),
  movimiento_id uuid references public.venta_movimientos (id) on delete cascade,
  nombre text not null check (length(trim(nombre)) between 1 and 200),
  -- Archivo en Storage (ruta dentro del bucket) o enlace externo (Drive). Uno de los dos.
  ruta text unique check (ruta is null or ruta ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/'),
  enlace text check (enlace is null or (enlace ~ '^https://' and length(enlace) <= 1000)),
  mime text check (mime is null or length(mime) <= 120),
  tamano bigint check (tamano is null or tamano >= 0),
  subido_por uuid default auth.uid() references public.perfiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check ((ruta is null) <> (enlace is null))
);
create index venta_documentos_venta_idx on public.venta_documentos (venta_id, tipo);
create index venta_documentos_movimiento_idx on public.venta_documentos (movimiento_id);

-- La ruta del archivo siempre empieza con agencia/venta, y el recibo es de un pago de la misma venta.
create function public.validar_documento() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.ruta is not null and new.ruta not like new.agencia_id::text || '/' || new.venta_id::text || '/%' then
    raise exception 'La ruta del archivo no corresponde a la venta' using errcode = '23514';
  end if;
  if new.movimiento_id is not null and not exists (select 1 from venta_movimientos m where m.id = new.movimiento_id and m.venta_id = new.venta_id) then
    raise exception 'El pago no pertenece a esta venta' using errcode = '23514';
  end if;
  if not exists (select 1 from ventas v where v.id = new.venta_id and v.agencia_id = new.agencia_id) then
    raise exception 'La venta no pertenece a esta agencia' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger venta_documentos_validar before insert or update on public.venta_documentos for each row execute function public.validar_documento();

create function public.validar_movimiento() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from ventas v where v.id = new.venta_id and v.agencia_id = new.agencia_id) then
    raise exception 'La venta no pertenece a esta agencia' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger venta_movimientos_validar before insert or update on public.venta_movimientos for each row execute function public.validar_movimiento();

create trigger venta_movimientos_bitacora after insert or update or delete on public.venta_movimientos for each row execute function public.registrar_bitacora();
create trigger venta_documentos_bitacora after insert or delete on public.venta_documentos for each row execute function public.registrar_bitacora();

-- ---------------------------------------------------------------------
-- Permisos: los mismos de la venta (el asesor, solo sus ventas; dirección, todas).
-- ---------------------------------------------------------------------
alter table public.venta_movimientos enable row level security;
alter table public.venta_documentos enable row level security;
revoke all on public.venta_movimientos, public.venta_documentos from anon;
grant select, insert, update, delete on public.venta_movimientos, public.venta_documentos to authenticated, service_role;

create policy venta_movimientos_todo on public.venta_movimientos for all to authenticated
  using (agencia_id = public.mi_agencia() and exists (select 1 from public.ventas v where v.id = venta_id))
  with check (agencia_id = public.mi_agencia() and exists (select 1 from public.ventas v where v.id = venta_id));

create policy venta_documentos_leer on public.venta_documentos for select to authenticated
  using (agencia_id = public.mi_agencia() and exists (select 1 from public.ventas v where v.id = venta_id));
create policy venta_documentos_crear on public.venta_documentos for insert to authenticated
  with check (agencia_id = public.mi_agencia() and exists (select 1 from public.ventas v where v.id = venta_id));
create policy venta_documentos_borrar on public.venta_documentos for delete to authenticated
  using (agencia_id = public.mi_agencia() and exists (select 1 from public.ventas v where v.id = venta_id));

-- ---------------------------------------------------------------------
-- Pasar el cuadre anterior (montos sueltos) a la cuenta del cliente.
-- ---------------------------------------------------------------------
insert into public.venta_movimientos (venta_id, agencia_id, tipo, concepto, aplica_a, monto, fecha, notas)
select v.id, v.agencia_id, x.tipo, x.concepto, x.aplica_a, x.monto, v.fecha, 'Del cuadre anterior'
from public.ventas v
cross join lateral (values
  ('pago', 'separacion', 'accesorios', (v.cuadre ->> 'separacion')::numeric),
  ('pago', 'cliente', 'factura', greatest(coalesce((v.cuadre ->> 'enganche')::numeric, 0) - coalesce((v.cuadre ->> 'separacion')::numeric, 0), 0)),
  ('pago', 'bono', 'factura', (v.cuadre ->> 'bonos')::numeric),
  ('pago', 'desembolso', 'factura', (v.cuadre ->> 'desembolso_real')::numeric),
  ('pago', 'cliente', 'factura', (v.cuadre ->> 'pagos_adicionales')::numeric),
  ('cargo', 'otro', null, (v.cuadre ->> 'extras')::numeric)
) as x (tipo, concepto, aplica_a, monto)
where v.cuadre <> '{}'::jsonb and x.monto is not null and x.monto > 0
  and coalesce((v.cuadre ->> 'enganche')::numeric, 0) >= 0;
