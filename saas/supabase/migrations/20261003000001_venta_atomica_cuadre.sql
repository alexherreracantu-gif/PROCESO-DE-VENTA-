-- =====================================================================
-- Guardado de venta en una sola transacción + cuadre financiero.
-- =====================================================================

-- Cuadre: enganche, separación, bonos, desembolso real, pagos adicionales y extras.
alter table public.ventas add column cuadre jsonb not null default '{}'::jsonb;

-- Guarda la venta y sus productos juntos: o se guarda todo o nada.
-- SECURITY INVOKER: se aplican los mismos permisos (RLS) de quien la llama.
create function public.guardar_venta(p_venta jsonb, p_productos uuid[], p_prospecto uuid default null)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid := nullif(p_venta ->> 'id', '')::uuid;
  r public.ventas;
begin
  r := jsonb_populate_record(null::public.ventas, p_venta);
  if v_id is null then
    insert into public.ventas (fecha, vendedor_id, cliente, num_cliente, telefono, vin, modelo_id, color, color_nombre,
                               forma_pago, plaza, estatus, fecha_entrega, valor_factura, notas, expediente)
    values (coalesce(r.fecha, current_date), r.vendedor_id, r.cliente, r.num_cliente, r.telefono, r.vin, r.modelo_id, r.color, r.color_nombre,
            r.forma_pago, r.plaza, coalesce(r.estatus, 'facturada'), r.fecha_entrega, r.valor_factura, r.notas,
            jsonb_build_object('cliente', coalesce(r.fecha, current_date)))
    returning id into v_id;
  else
    update public.ventas set
      fecha = r.fecha, vendedor_id = r.vendedor_id, cliente = r.cliente, num_cliente = r.num_cliente, telefono = r.telefono,
      vin = r.vin, modelo_id = r.modelo_id, color = r.color, color_nombre = r.color_nombre, forma_pago = r.forma_pago,
      plaza = r.plaza, estatus = r.estatus, fecha_entrega = r.fecha_entrega, valor_factura = r.valor_factura, notas = r.notas
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

revoke execute on function public.guardar_venta(jsonb, uuid[], uuid) from anon, public;
grant execute on function public.guardar_venta(jsonb, uuid[], uuid) to authenticated, service_role;
