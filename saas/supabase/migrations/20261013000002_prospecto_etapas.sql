-- Historial de etapas del prospecto: cada vez que uno entra al CRM o cambia de etapa queda un
-- renglón con la etapa de la que venía y a la que llegó. Lo usa el reporte semanal
-- (/api/cron/reporte-semanal) para contar contactados, citas, propuestas y cierres de la semana.
-- No guarda datos del cliente: solo ids, etapas y la hora.
create table if not exists public.prospecto_etapas (
  id bigint generated always as identity primary key,
  agencia_id uuid not null references public.agencias (id) on delete cascade,
  prospecto_id uuid not null references public.prospectos (id) on delete cascade,
  de public.etapa_prospecto,
  a public.etapa_prospecto not null,
  usuario_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists prospecto_etapas_agencia_idx on public.prospecto_etapas (agencia_id, created_at);
create index if not exists prospecto_etapas_prospecto_idx on public.prospecto_etapas (prospecto_id);

create or replace function public.registrar_etapa_prospecto() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_de etapa_prospecto;
begin
  if tg_op = 'UPDATE' then
    if new.etapa is not distinct from old.etapa then return null; end if;
    v_de := old.etapa;
  end if;
  insert into prospecto_etapas (agencia_id, prospecto_id, de, a, usuario_id)
  values (new.agencia_id, new.id, v_de, new.etapa, auth.uid());
  return null;
end $$;

drop trigger if exists prospectos_etapas on public.prospectos;
create trigger prospectos_etapas after insert or update of etapa on public.prospectos
  for each row execute function public.registrar_etapa_prospecto();

-- Lo que ya había antes de este historial: alta en su fecha de creación y, si ya avanzó,
-- un cambio a su etapa actual en su última modificación (lo más cercano que se sabe).
insert into public.prospecto_etapas (agencia_id, prospecto_id, de, a, created_at)
select p.agencia_id, p.id, null, 'nuevo', p.created_at
from public.prospectos p
where not exists (select 1 from public.prospecto_etapas e where e.prospecto_id = p.id);
insert into public.prospecto_etapas (agencia_id, prospecto_id, de, a, created_at)
select p.agencia_id, p.id, 'nuevo', p.etapa, greatest(p.updated_at, p.created_at)
from public.prospectos p
where p.etapa <> 'nuevo'
  and not exists (select 1 from public.prospecto_etapas e where e.prospecto_id = p.id and e.de is not null);

-- Permisos: igual que prospectos (el asesor ve el historial de los suyos; dirección, el de todos).
-- Nadie escribe directo: solo el disparador.
alter table public.prospecto_etapas enable row level security;
revoke all on public.prospecto_etapas from anon, authenticated;
grant select on public.prospecto_etapas to authenticated;
grant select, insert, update, delete on public.prospecto_etapas to service_role;
drop policy if exists prospecto_etapas_leer on public.prospecto_etapas;
create policy prospecto_etapas_leer on public.prospecto_etapas for select to authenticated
  using (agencia_id = public.mi_agencia() and (
    public.es_direccion()
    or exists (select 1 from public.prospectos p where p.id = prospecto_id and p.asesor_id = auth.uid())
  ));
