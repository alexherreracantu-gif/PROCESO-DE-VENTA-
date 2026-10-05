-- Instalación de Wallbox como producto (se financia en el cotizador y cuenta como venta cruzada).
insert into public.productos (agencia_id, clave, nombre, nombre_corto, precio, orden)
values ('0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01', 'wallbox', 'Instalación Wallbox', 'Wallbox', 9744, 8)
on conflict (agencia_id, clave) do nothing;
