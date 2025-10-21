-- Adicionar campo proxy_url para API intermediária
ALTER TABLE public.database_connections
ADD COLUMN IF NOT EXISTS proxy_url TEXT;