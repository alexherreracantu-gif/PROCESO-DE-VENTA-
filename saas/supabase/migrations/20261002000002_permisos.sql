-- =====================================================================
-- Park Point · permisos (Row Level Security)
-- Dirección = CEO y gerente: ven y editan todo lo de su agencia.
-- Asesor: solo sus ventas, prospectos, cortes y academia.
-- Nadie ve datos de otra agencia.
-- =====================================================================

alter table public.agencias enable row level security;
alter table public.perfiles enable row level security;
alter table public.modelos enable row level security;
alter table public.productos enable row level security;
alter table public.ventas enable row level security;
alter table public.venta_productos enable row level security;
alter table public.metas enable row level security;
alter table public.metas_producto enable row level security;
alter table public.prospectos enable row level security;
alter table public.cortes enable row level security;
alter table public.academia_progreso enable row level security;
alter table public.bitacora enable row level security;

-- Nada es visible sin sesión.
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon, public;
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;

-- Agencia ------------------------------------------------------------
create policy agencias_leer on public.agencias for select to authenticated
  using (id = public.mi_agencia());
create policy agencias_editar on public.agencias for update to authenticated
  using (id = public.mi_agencia() and public.es_direccion())
  with check (id = public.mi_agencia() and public.es_direccion());

-- Perfiles: todos ven a su equipo; cada quien edita sus datos de contacto.
-- Rol, ventas y altas/bajas se cambian solo desde el servidor (Equipo).
create policy perfiles_leer on public.perfiles for select to authenticated
  using (agencia_id = public.mi_agencia());
create policy perfiles_editar_propio on public.perfiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke insert, update, delete on public.perfiles from authenticated;
grant update (nombre, nombre_corto, telefono) on public.perfiles to authenticated;

-- Catálogo: todos leen, dirección edita ---------------------------------
create policy modelos_leer on public.modelos for select to authenticated
  using (agencia_id = public.mi_agencia());
create policy modelos_escribir on public.modelos for all to authenticated
  using (agencia_id = public.mi_agencia() and public.es_direccion())
  with check (agencia_id = public.mi_agencia() and public.es_direccion());

create policy productos_leer on public.productos for select to authenticated
  using (agencia_id = public.mi_agencia());
create policy productos_escribir on public.productos for all to authenticated
  using (agencia_id = public.mi_agencia() and public.es_direccion())
  with check (agencia_id = public.mi_agencia() and public.es_direccion());

-- Ventas ---------------------------------------------------------------
create policy ventas_leer on public.ventas for select to authenticated
  using (agencia_id = public.mi_agencia() and (public.es_direccion() or vendedor_id = auth.uid()));
create policy ventas_crear on public.ventas for insert to authenticated
  with check (agencia_id = public.mi_agencia() and (public.es_direccion() or vendedor_id = auth.uid()));
create policy ventas_editar on public.ventas for update to authenticated
  using (agencia_id = public.mi_agencia() and (public.es_direccion() or vendedor_id = auth.uid()))
  with check (agencia_id = public.mi_agencia() and (public.es_direccion() or vendedor_id = auth.uid()));
-- Borrar solo dirección; el asesor la marca como cancelada.
create policy ventas_borrar on public.ventas for delete to authenticated
  using (agencia_id = public.mi_agencia() and public.es_direccion());

-- Productos de una venta: mismos permisos que la venta.
create policy venta_productos_todo on public.venta_productos for all to authenticated
  using (exists (select 1 from public.ventas v where v.id = venta_id))
  with check (exists (select 1 from public.ventas v where v.id = venta_id));

-- Metas: todos leen, dirección edita ----------------------------------
create policy metas_leer on public.metas for select to authenticated
  using (agencia_id = public.mi_agencia());
create policy metas_escribir on public.metas for all to authenticated
  using (agencia_id = public.mi_agencia() and public.es_direccion())
  with check (agencia_id = public.mi_agencia() and public.es_direccion());

create policy metas_producto_leer on public.metas_producto for select to authenticated
  using (agencia_id = public.mi_agencia());
create policy metas_producto_escribir on public.metas_producto for all to authenticated
  using (agencia_id = public.mi_agencia() and public.es_direccion())
  with check (agencia_id = public.mi_agencia() and public.es_direccion());

-- Prospectos ------------------------------------------------------------
create policy prospectos_leer on public.prospectos for select to authenticated
  using (agencia_id = public.mi_agencia() and (public.es_direccion() or asesor_id = auth.uid()));
create policy prospectos_crear on public.prospectos for insert to authenticated
  with check (agencia_id = public.mi_agencia() and (public.es_direccion() or asesor_id = auth.uid()));
create policy prospectos_editar on public.prospectos for update to authenticated
  using (agencia_id = public.mi_agencia() and (public.es_direccion() or asesor_id = auth.uid()))
  with check (agencia_id = public.mi_agencia() and (public.es_direccion() or asesor_id = auth.uid()));
create policy prospectos_borrar on public.prospectos for delete to authenticated
  using (agencia_id = public.mi_agencia() and (public.es_direccion() or asesor_id = auth.uid()));

-- Cortes: cada quien captura el suyo; dirección ve todos -----------------
create policy cortes_leer on public.cortes for select to authenticated
  using (agencia_id = public.mi_agencia() and (public.es_direccion() or usuario_id = auth.uid()));
create policy cortes_crear on public.cortes for insert to authenticated
  with check (agencia_id = public.mi_agencia() and usuario_id = auth.uid());
create policy cortes_editar on public.cortes for update to authenticated
  using (agencia_id = public.mi_agencia() and usuario_id = auth.uid())
  with check (agencia_id = public.mi_agencia() and usuario_id = auth.uid());

-- Academia ---------------------------------------------------------------
create policy academia_leer on public.academia_progreso for select to authenticated
  using (agencia_id = public.mi_agencia() and (public.es_direccion() or usuario_id = auth.uid()));
create policy academia_crear on public.academia_progreso for insert to authenticated
  with check (agencia_id = public.mi_agencia() and usuario_id = auth.uid());
create policy academia_editar on public.academia_progreso for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid() and agencia_id = public.mi_agencia());

-- Bitácora: solo dirección, solo lectura --------------------------------
create policy bitacora_leer on public.bitacora for select to authenticated
  using (agencia_id = public.mi_agencia() and public.es_direccion());
revoke insert, update, delete on public.bitacora from authenticated;
