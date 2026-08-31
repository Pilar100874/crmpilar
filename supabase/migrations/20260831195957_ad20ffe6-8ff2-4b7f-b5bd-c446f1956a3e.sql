ALTER TABLE public.port_coletores
  ADD COLUMN IF NOT EXISTS device_key text,
  ADD COLUMN IF NOT EXISTS unidade_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS port_coletores_device_key_uidx
  ON public.port_coletores (device_key) WHERE device_key IS NOT NULL;