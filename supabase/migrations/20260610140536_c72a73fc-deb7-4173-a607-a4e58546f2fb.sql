ALTER TABLE public.whatsapp_config 
  ADD COLUMN IF NOT EXISTS manager_user TEXT,
  ADD COLUMN IF NOT EXISTS manager_password TEXT;