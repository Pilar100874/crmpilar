-- Remover a constraint existente e adicionar uma nova que inclui 'external_server'
ALTER TABLE public.email_oauth_config DROP CONSTRAINT IF EXISTS email_oauth_config_provider_check;

ALTER TABLE public.email_oauth_config ADD CONSTRAINT email_oauth_config_provider_check 
  CHECK (provider IN ('google', 'microsoft', 'external_server'));