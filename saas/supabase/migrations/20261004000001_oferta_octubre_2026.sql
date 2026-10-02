-- =====================================================================
-- Oferta comercial BYD octubre 2026 (OC-2610-1), vigencia 1 al 31 de octubre.
-- Precios públicos con IVA y bono flexible por modelo. Cambios contra septiembre:
--   · Dolphin Mini 300 km: bono $25,000 → $0
--   · King GS: bono $0 → $25,000 (solo interior gris/azul)
-- El bono flexible aplica solo financiando con BBVA, Santander, Banorte o KUNA,
-- desde 5% de enganche; de contado se factura a precio lleno.
-- Se aplica una sola vez; después los precios se editan en Catálogo y precios.
-- =====================================================================

update public.modelos m
set precio = o.precio, bono = o.bono
from (values
  ('dolphin-mini-300',  399800,      0),
  ('dolphin-mini-380',  415800,  30000),
  ('yuan-pro-ev',       536500,      0),
  ('seal-rwd',          778800,      0),
  ('seal-awd',          888800,      0),
  ('sealion-7',         949800,  61700),
  ('king-gl',           524900,  25000),
  ('king-gs',           579900,  25000),
  ('yuan-pro-dmi',      519999,  20000),
  ('song-pro',          599880,  35000),
  ('song-plus',         778800,  78000),
  ('shark-gl',          899980,  55000),
  ('shark-gs',          969800,  55000),
  ('m9',                979800, 100000),
  ('atto-8',           1199800,      0)
) as o (clave, precio, bono)
where m.clave = o.clave
  and m.agencia_id = '0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01';

update public.modelos
set descripcion = 'King con más equipo. Bono flexible de octubre solo con interior gris/azul.'
where clave = 'king-gs' and agencia_id = '0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01';

update public.modelos
set descripcion = 'SUV 100% eléctrico. Precio especial de octubre.'
where clave = 'yuan-pro-ev' and agencia_id = '0b7d0c3e-5f1a-4c8e-9a51-3c2d7e1f0a01';
