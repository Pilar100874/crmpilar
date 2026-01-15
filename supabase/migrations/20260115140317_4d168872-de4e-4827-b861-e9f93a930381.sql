-- Add image fields to produto_grupos table
ALTER TABLE public.produto_grupos 
ADD COLUMN IF NOT EXISTS imagem_referencia TEXT,
ADD COLUMN IF NOT EXISTS imagem_catalogo TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.produto_grupos.imagem_referencia IS 'Imagem de referência do produto';
COMMENT ON COLUMN public.produto_grupos.imagem_catalogo IS 'Imagem para usar no catálogo de produtos';