-- Add campo to produtos to define pricing type
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS tipo_preco TEXT DEFAULT 'categoria' CHECK (tipo_preco IN ('categoria', 'produto'));

-- Add product-level pricing fields to produtos table
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS preco_minimo NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS preco_tabela NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS preco_ativo BOOLEAN DEFAULT true;

-- Add comment explaining the fields
COMMENT ON COLUMN public.produtos.tipo_preco IS 'Define se usa preço por categoria ou preço do próprio produto';
COMMENT ON COLUMN public.produtos.preco_minimo IS 'Preço mínimo quando tipo_preco = produto';
COMMENT ON COLUMN public.produtos.preco_tabela IS 'Preço de tabela quando tipo_preco = produto';
COMMENT ON COLUMN public.produtos.preco_ativo IS 'Se o preço do produto está ativo';