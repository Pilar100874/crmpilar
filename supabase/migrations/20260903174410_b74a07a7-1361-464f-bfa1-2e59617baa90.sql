ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS sip_servidor text,
  ADD COLUMN IF NOT EXISTS sip_servidor_alternativo text,
  ADD COLUMN IF NOT EXISTS ramal_portaria text;