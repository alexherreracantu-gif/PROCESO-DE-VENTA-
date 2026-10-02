-- =====================================================================
-- Metas de unidades: 5 por vendedor y 10 para Omar (octubre 2026).
-- También deja 5 como meta inicial para los meses sin metas guardadas.
-- Después se editan cada mes en Objetivos.
-- =====================================================================

update public.agencias
set parametros = parametros || '{"meta_unidades": 5}'::jsonb
where id = '0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01';

insert into public.metas (agencia_id, mes, vendedor_id, unidades)
select p.agencia_id, date '2026-10-01', p.id, case when p.usuario = 'omar' then 10 else 5 end
from public.perfiles p
where p.agencia_id = '0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01' and p.vende and p.activo
on conflict (agencia_id, mes, vendedor_id) do update set unidades = excluded.unidades;
