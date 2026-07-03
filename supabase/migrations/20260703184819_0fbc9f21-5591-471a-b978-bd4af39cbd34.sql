ALTER TABLE public.sms_config
  ADD COLUMN IF NOT EXISTS pilar_endpoint text,
  ADD COLUMN IF NOT EXISTS pilar_token text,
  ADD COLUMN IF NOT EXISTS pilar_sender text;