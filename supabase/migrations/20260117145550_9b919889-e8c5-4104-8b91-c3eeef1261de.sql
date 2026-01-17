-- Add website scraping configuration to prospects_b2b_config
ALTER TABLE public.prospects_b2b_config 
ADD COLUMN IF NOT EXISTS extrair_contatos_website jsonb DEFAULT '{"enabled": false, "method": "basic"}'::jsonb;