-- Adicionar campos para fotos adicionais do produto
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS foto_url_2 TEXT,
ADD COLUMN IF NOT EXISTS foto_url_3 TEXT;

-- Comentários
COMMENT ON COLUMN public.produtos.foto_url_2 IS 'URL da segunda foto do produto para marketplaces';
COMMENT ON COLUMN public.produtos.foto_url_3 IS 'URL da terceira foto do produto para marketplaces';