-- Instalación de Wallbox como producto (se financia en el cotizador y cuenta como venta cruzada).
-- Solo si la agencia ya existe (en una instalación nueva lo trae seed.sql).
insert into public.productos (agencia_id, clave, nombre, nombre_corto, precio, orden)
select a.id, 'wallbox', 'Instalación Wallbox', 'Wallbox', 9744, 8
from public.agencias a
where a.id = '0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01'
on conflict (agencia_id, clave) do nothing;
