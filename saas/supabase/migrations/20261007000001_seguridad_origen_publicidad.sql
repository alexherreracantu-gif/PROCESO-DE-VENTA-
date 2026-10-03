-- =====================================================================
-- · Contraseña temporal: aviso para que cada quien ponga la suya.
-- · Correo real de cada usuario para el resumen diario.
-- · Origen de cada venta (Meta Ads, referido, piso…) e inversión en
--   publicidad por mes, para saber cuánto cuesta cada venta.
-- =====================================================================

alter table public.perfiles add column clave_temporal boolean not null default false;
alter table public.perfiles add column correo text check (correo is null or (correo ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(correo) <= 200));
-- Cada quien puede poner su correo; la marca de contraseña temporal la cambia solo el servidor.
grant update (correo) on public.perfiles to authenticated;

-- Hasta hoy todo el equipo comparte la contraseña inicial.
update public.perfiles set clave_temporal = true;

alter table public.ventas add column origen text check (origen is null or length(origen) <= 40);

-- Las ventas que salieron del CRM toman el origen del prospecto.
update public.ventas v set origen = p.origen
  from public.prospectos p
 where p.venta_id = v.id and v.origen is null;

create or replace function public.guardar_venta(p_venta jsonb, p_productos uuid[], p_prospecto uuid default null)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid := nullif(p_venta ->> 'id', '')::uuid;
  r public.ventas;
begin
  r := jsonb_populate_record(null::public.ventas, p_venta);
  if r.origen is null and p_prospecto is not null then
    select origen into r.origen from public.prospectos where id = p_prospecto;
  end if;
  if v_id is null then
    insert into public.ventas (fecha, vendedor_id, cliente, num_cliente, telefono, vin, modelo_id, color, color_nombre,
                               forma_pago, plaza, estatus, fecha_entrega, valor_factura, notas, origen, expediente)
    values (coalesce(r.fecha, current_date), r.vendedor_id, r.cliente, r.num_cliente, r.telefono, r.vin, r.modelo_id, r.color, r.color_nombre,
            r.forma_pago, r.plaza, coalesce(r.estatus, 'facturada'), r.fecha_entrega, r.valor_factura, r.notas, r.origen,
            jsonb_build_object('cliente', coalesce(r.fecha, current_date)))
    returning id into v_id;
  else
    update public.ventas set
      fecha = r.fecha, vendedor_id = r.vendedor_id, cliente = r.cliente, num_cliente = r.num_cliente, telefono = r.telefono,
      vin = r.vin, modelo_id = r.modelo_id, color = r.color, color_nombre = r.color_nombre, forma_pago = r.forma_pago,
      plaza = r.plaza, estatus = r.estatus, fecha_entrega = r.fecha_entrega, valor_factura = r.valor_factura, notas = r.notas,
      origen = r.origen
    where id = v_id;
    if not found then
      raise exception 'No se encontró la venta o no tienes permiso para editarla' using errcode = '42501';
    end if;
  end if;

  delete from public.venta_productos where venta_id = v_id;
  insert into public.venta_productos (venta_id, producto_id, precio)
  select v_id, pr.id, pr.precio from public.productos pr where pr.id = any (coalesce(p_productos, '{}'));

  if p_prospecto is not null then
    update public.prospectos
       set venta_id = v_id, etapa = case when r.estatus = 'entregada' then 'entregado'::public.etapa_prospecto else 'apartado'::public.etapa_prospecto end
     where id = p_prospecto;
  end if;
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- Inversión en publicidad: cuánto puso cada quien por canal y mes.
-- ---------------------------------------------------------------------
create table public.inversion_publicidad (
  id uuid primary key default gen_random_uuid(),
  agencia_id uuid not null default public.mi_agencia() references public.agencias (id) on delete cascade,
  usuario_id uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  mes date not null check (extract(day from mes) = 1),
  canal text not null check (length(trim(canal)) between 1 and 40),
  monto numeric(12, 2) not null check (monto >= 0 and monto <= 10000000),
  updated_at timestamptz not null default now(),
  unique (usuario_id, mes, canal)
);
create trigger inversion_publicidad_tocar before update on public.inversion_publicidad for each row execute function public.tocar_updated_at();

alter table public.inversion_publicidad enable row level security;
revoke all on public.inversion_publicidad from anon;
grant select, insert, update, delete on public.inversion_publicidad to authenticated, service_role;

-- Cada quien captura la suya; dirección ve la de todo el equipo.
create policy inversion_leer on public.inversion_publicidad for select to authenticated
  using (agencia_id = public.mi_agencia() and (usuario_id = auth.uid() or public.es_direccion()));
create policy inversion_escribir on public.inversion_publicidad for all to authenticated
  using (agencia_id = public.mi_agencia() and usuario_id = auth.uid())
  with check (agencia_id = public.mi_agencia() and usuario_id = auth.uid());
