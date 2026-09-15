ALTER TABLE public.automacao_app_chaves
  ADD COLUMN IF NOT EXISTS coletor_device_key text;

CREATE UNIQUE INDEX IF NOT EXISTS automacao_app_chaves_coletor_device_key_uidx
  ON public.automacao_app_chaves (coletor_device_key)
  WHERE coletor_device_key IS NOT NULL;