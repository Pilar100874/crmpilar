-- Adicionar coluna para webhook de publicação
ALTER TABLE public.marketing_resources 
ADD COLUMN IF NOT EXISTS n8n_publish_webhook_url TEXT;