-- Adicionar campos para suportar URLs customizadas na tabela api_endpoints
ALTER TABLE public.api_endpoints
ADD COLUMN IF NOT EXISTS is_custom boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_url text;

-- Criar índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_api_endpoints_is_custom ON public.api_endpoints(is_custom) WHERE is_custom = true;

-- Comentários para documentação
COMMENT ON COLUMN public.api_endpoints.is_custom IS 'Indica se é uma URL customizada ao invés de uma API gerada pelo sistema';
COMMENT ON COLUMN public.api_endpoints.custom_url IS 'URL completa quando is_custom = true';