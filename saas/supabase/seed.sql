-- =====================================================================
-- Datos iniciales: agencia BYD Cumbres · Park Point y su catálogo.
-- Precios y bonos: oferta de octubre 2026 (OC-2610-1). Se actualizan cada mes
-- desde la pantalla Catálogo (no hace falta volver a correr esto).
-- Es seguro correrlo varias veces.
-- =====================================================================

insert into public.agencias (id, nombre, marca, grupo, ciudad, parametros) values (
  '0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01',
  'BYD Cumbres · Park Point', 'BYD', 'Grupo TEC', 'Monterrey, N.L.',
  '{"placas_electrico": 1760, "placas_hibrido": 5866, "gestoria": 3016, "permiso_frontera": 1199, "separacion": 5000, "garantia_extendida": 9082, "meta_unidades": 5, "meta_producto": 50}'
) on conflict (id) do nothing;

insert into public.modelos (agencia_id, clave, nombre, anio, motor, precio, bono, orden, banorte_submarca, banorte_anio, banorte_modelo, descripcion) values
  ('0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01', 'dolphin-mini-300', 'Dolphin Mini 300 km', 2026, 'electrico', 399800, 0, 1, '93288', '3006', 'BY2603A123576', 'Entrada tecnológica a BYD. Eléctrico, compacto y bien equipado.'),
  ('0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01', 'dolphin-mini-380', 'Dolphin Mini 380 km', 2026, 'electrico', 415800, 30000, 2, '93288', '3006', 'BY2603A123577', 'Más autonomía para trayectos metropolitanos.'),
  ('0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01', 'yuan-pro-dmi', 'Yuan Pro DM-i', 2027, 'hibrido', 519999, 20000, 3, '95630', '3362', 'BY2713A125715', 'SUV compacto híbrido.'),
  ('0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01', 'king-gl', 'King GL DM-i', 2027, 'hibrido', 524900, 25000, 4, '93388', '3362', 'BY2709A125999', 'Producto héroe de Park Point. Tasa 7.18% con 50% de enganche.'),
  ('0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01', 'yuan-pro-ev', 'Yuan Pro EV', 2026, 'electrico', 536500, 0, 5, '95630', '3006', 'BY2613A125550', 'SUV 100% eléctrico. Precio especial de octubre.'),
  ('0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01', 'king-gs', 'King GS DM-i', 2027, 'hibrido', 579900, 25000, 6, '93388', '3362', 'BY2709A126000', 'King con más equipo. Bono flexible de octubre solo con interior gris/azul.'),
  ('0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01', 'song-pro', 'Song Pro DM-i', 2026, 'hibrido', 599880, 35000, 7, '95628', '3006', 'BY2612A125074', 'SUV familiar con DM-i.'),
  ('0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01', 'seal-rwd', 'Seal RWD', 2026, 'electrico', 778800, 0, 8, '92208', '3006', 'BY2607A124660', 'Sedán eléctrico de manejo.'),
  ('0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01', 'song-plus', 'Song Plus DM-i', 2026, 'hibrido', 778800, 78000, 9, '95629', '3006', 'BY2608A123723', 'SUV de volumen premium. El bono más visible del piso.'),
  ('0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01', 'seal-awd', 'Seal AWD', 2026, 'electrico', 888800, 0, 10, '92208', '3006', 'BY2607A124661', 'Seal con doble motor.'),
  ('0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01', 'shark-gl', 'Shark GL DMO', 2026, 'hibrido', 899980, 55000, 11, '93668', '3006', 'BY2610C125192', 'Pickup híbrida.'),
  ('0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01', 'sealion-7', 'Sealion 7', 2026, 'electrico', 949800, 61700, 12, '95088', '3006', 'BY2614A123783', 'SUV cupé eléctrico.'),
  ('0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01', 'shark-gs', 'Shark GS DMO', 2026, 'hibrido', 969800, 55000, 13, '93668', '3006', 'BY2610C125193', 'Shark tope de línea.'),
  ('0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01', 'm9', 'M9', 2026, 'hibrido', 979800, 100000, 14, '96088', '3006', 'BY2615A124013', 'MPV premium de tres filas.'),
  ('0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01', 'atto-8', 'Atto 8', 2026, 'hibrido', 1199800, 0, 15, '96188', '3006', 'BY2616A124945', 'SUV insignia.')
on conflict (agencia_id, clave) do nothing;

insert into public.productos (agencia_id, clave, nombre, nombre_corto, precio, orden) values
  ('0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01', 'garantia', 'Garantía extendida', 'Garantía', 9082, 1),
  ('0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01', 'accesorios', 'Accesorios', 'Accesorios', 6500, 2),
  ('0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01', 'cerocible', 'Cerocible', 'Cerocible', 4592, 3),
  ('0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01', 'llantas', 'Seguro de llantas', 'Seg. llantas', 4487, 4),
  ('0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01', 'placas', 'Trámite de placas', 'Placas', 3016, 5),
  ('0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01', 'seguro', 'Seguro', 'Seguro', null, 6),
  ('0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01', 'refaccion', 'Llanta de refacción', 'Refacción', null, 7)
on conflict (agencia_id, clave) do nothing;
