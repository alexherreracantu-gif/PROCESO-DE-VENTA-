-- Datos estructurados del prospecto. Por ahora los de la landing de flotillas (tipo de cliente,
-- organización, unidades, km por día, ahorro estimado y consentimiento de WhatsApp), que usa la
-- propuesta imprimible /propuesta/[id]. Los permisos por fila de prospectos ya cubren la columna.
alter table public.prospectos add column if not exists datos jsonb not null default '{}'::jsonb;
