ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'evolution',
  ADD COLUMN IF NOT EXISTS cloud_phone_number_id text,
  ADD COLUMN IF NOT EXISTS cloud_access_token text,
  ADD COLUMN IF NOT EXISTS cloud_business_account_id text,
  ADD COLUMN IF NOT EXISTS cloud_webhook_verify_token text;

ALTER TABLE public.whatsapp_config
  DROP CONSTRAINT IF EXISTS whatsapp_config_provider_check;

ALTER TABLE public.whatsapp_config
  ADD CONSTRAINT whatsapp_config_provider_check
  CHECK (provider IN ('evolution', 'cloud_api'));