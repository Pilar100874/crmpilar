ALTER TABLE public.whatsapp_sessions
  ADD COLUMN IF NOT EXISTS auto_reconnect_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS last_reconnect_at timestamptz;