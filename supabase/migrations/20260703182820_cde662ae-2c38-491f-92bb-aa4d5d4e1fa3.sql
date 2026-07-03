ALTER TABLE public.sms_config
  ADD COLUMN IF NOT EXISTS smsgate_base_url TEXT,
  ADD COLUMN IF NOT EXISTS smsgate_username TEXT,
  ADD COLUMN IF NOT EXISTS smsgate_password TEXT,
  ADD COLUMN IF NOT EXISTS smsgatewayme_email TEXT,
  ADD COLUMN IF NOT EXISTS smsgatewayme_password TEXT,
  ADD COLUMN IF NOT EXISTS smsgatewayme_device_id TEXT;