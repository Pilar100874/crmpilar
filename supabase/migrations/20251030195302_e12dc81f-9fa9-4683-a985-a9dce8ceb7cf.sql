-- Add WAHA configuration fields to whatsapp_config table
ALTER TABLE public.whatsapp_config 
ADD COLUMN IF NOT EXISTS waha_url TEXT,
ADD COLUMN IF NOT EXISTS waha_api_key TEXT;