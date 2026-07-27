ALTER TABLE public.whatsapp_config RENAME COLUMN waha_url TO evolution_url;
ALTER TABLE public.whatsapp_config RENAME COLUMN waha_api_key TO evolution_api_key;
COMMENT ON COLUMN public.whatsapp_config.evolution_url IS 'URL base do servidor Evolution API';
COMMENT ON COLUMN public.whatsapp_config.evolution_api_key IS 'API Key (apikey) do servidor Evolution API';

ALTER TABLE public.whatsapp_numeros RENAME COLUMN waha_url TO evolution_url;
ALTER TABLE public.whatsapp_numeros RENAME COLUMN waha_api_key TO evolution_api_key;

ALTER TABLE public.bot_flows DROP CONSTRAINT IF EXISTS bot_flows_whatsapp_type_check;
UPDATE public.bot_flows SET whatsapp_type = 'evolution' WHERE whatsapp_type = 'waha';
ALTER TABLE public.bot_flows ALTER COLUMN whatsapp_type SET DEFAULT 'evolution';
ALTER TABLE public.bot_flows
  ADD CONSTRAINT bot_flows_whatsapp_type_check
  CHECK (whatsapp_type IN ('evolution', 'business'));